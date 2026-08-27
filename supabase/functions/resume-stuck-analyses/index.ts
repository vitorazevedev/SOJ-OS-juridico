import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Vigia de análises travadas — a Fase A terminou (contract_analyses em
// pending_enrichment) mas a Fase B nunca confirmou nem um lote, e ninguém
// está processando agora (lock obsoleto). Cobre o caso em que ninguém volta
// a abrir a página (a retomada automática do front-end só ajuda quem
// reabre) — caso real: cliente Matrix, 2026-08-24, ficou travado 2 dias até
// intervenção manual.
//
// Processa só UM lote de UM contrato por execução — cada lote pode levar
// até ~150s (mesmo orçamento da Fase B normal), e esta function tem o
// mesmo teto de 150s de idle timeout; tentar mais de um lote por execução
// arriscaria estourar esse teto. O próximo tick do cron continua de onde
// parou, até has_more=false.

const STALE_LOCK_MS = 5 * 60 * 1000 // espelha STALE_LOCK_MS em analyze-contract/index.ts
const PHASE_B_BATCH_SIZE = 6 // espelha PHASE_B_BATCH_SIZE em analyze-contract/index.ts

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  // verify_jwt=false (pg_cron chama sem Authorization) -- exige o segredo
  // compartilhado que o próprio job de cron envia.
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (req.headers.get('x-cron-secret') !== cronSecret) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const serviceClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Fase A concluída (pending_enrichment) + contrato ainda em_analise —
  // candidatos a estarem travados. O filtro de lock obsoleto é aplicado em
  // código logo abaixo (analysis_started_at pode ser null ou antigo).
  // Duas consultas simples em vez de um embed aninhado — mais fácil de
  // depurar, e a comparação de data é feita como número (getTime()), não
  // como string, evitando qualquer diferença sutil de formato ISO entre o
  // que o Postgres devolve e o que o JS gera.
  const { data: pending, error: queryErr } = await serviceClient
    .from('contract_analyses')
    .select('contract_id')
    .eq('status', 'pending_enrichment')
    .limit(50)

  if (queryErr) {
    return jsonResponse({ error: queryErr.message }, 500)
  }

  const pendingIds = (pending ?? []).map((r) => r.contract_id)
  if (pendingIds.length === 0) {
    return jsonResponse({ success: true, resumed: null, checked: 0 })
  }

  const { data: contractsRows, error: contractsErr } = await serviceClient
    .from('contracts')
    .select('id, status, analysis_started_at')
    .in('id', pendingIds)
    .eq('status', 'em_analise')

  if (contractsErr) {
    return jsonResponse({ error: contractsErr.message }, 500)
  }

  const staleThresholdMs = Date.now() - STALE_LOCK_MS
  const stuckContract = (contractsRows ?? []).find((c) => {
    return !c.analysis_started_at || new Date(c.analysis_started_at).getTime() < staleThresholdMs
  })

  if (!stuckContract) {
    return jsonResponse({ success: true, resumed: null, checked: (contractsRows ?? []).length })
  }

  const contractId = stuckContract.id

  const { data: analysisRow } = await serviceClient
    .from('contract_analyses')
    .select('id')
    .eq('contract_id', contractId)
    .eq('status', 'pending_enrichment')
    .maybeSingle()

  if (!analysisRow) {
    return jsonResponse({ success: true, resumed: null, reason: 'analysis sumiu antes de retomar' })
  }

  // Mesma lógica do hook do cliente: retoma do lote seguinte ao último
  // enriquecido, nunca refaz o que já está pronto.
  const { data: clauseRows } = await serviceClient
    .from('clause_risks')
    .select('conclusao')
    .eq('analysis_id', analysisRow.id)
    .order('sort_order', { ascending: true })

  const rows = clauseRows ?? []
  const enrichedCount = rows.filter((r) => r.conclusao != null).length
  const batchIndex = Math.floor(enrichedCount / PHASE_B_BATCH_SIZE)

  // Chama analyze-contract via HTTP com a via de recuperação (mesma usada
  // pra destravar o cliente Matrix manualmente) — nunca duplica a lógica de
  // gating/sanitização aqui, só aciona o próximo lote. resume:true reclama
  // o lock atomicamente; se outra retomada (aba do usuário) já pegou
  // primeiro, o analyze-contract responde already_in_progress e este tick
  // simplesmente não fez nada (sem erro, sem duplicar trabalho).
  const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/analyze-contract`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
      'apikey': Deno.env.get('SUPABASE_ANON_KEY')!,
      'x-cron-secret': cronSecret!,
    },
    body: JSON.stringify({ contract_id: contractId, phase: 'B', batch_index: batchIndex, resume: true }),
  })

  const result = await res.json().catch(() => ({}))
  return jsonResponse({ success: res.ok, resumed: contractId, batch_index: batchIndex, http_status: res.status, result })
})
