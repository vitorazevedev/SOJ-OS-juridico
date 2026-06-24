import { createClient } from 'npm:@supabase/supabase-js@2'

// STORY-007 (LGPD — política de retenção de dados): cron diário que identifica
// organizações sem nenhuma atividade de contrato (nenhum upload/atualização) há mais de
// RETENTION_MONTHS meses e registra um evento de auditoria sinalizando-as como candidatas
// a limpeza.
//
// Decisão deliberada: NÃO exclui dados automaticamente. O prazo exato de retenção e se a
// exclusão deve ser automática ou exigir confirmação humana é uma decisão de produto/jurídica
// ainda pendente de validação com @po e advogado (ver docs/decisions/2026-06-21-...md item 6
// e STORY-007 Riscos: "Exclusão de conta remove dados que deveriam ser retidos por obrigação
// legal/fiscal"). Até essa decisão ser tomada, este job só sinaliza — a exclusão real
// continua sendo feita pelo usuário via "Excluir minha conta" em Configurações
// (supabase/functions/delete-account), uma ação explícita e confirmada.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Pending business/legal confirmation — 24 months is a conservative placeholder, not a
// validated retention period.
const RETENTION_MONTHS = 24

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const serviceClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const cutoff = new Date()
  cutoff.setUTCMonth(cutoff.getUTCMonth() - RETENTION_MONTHS)
  const cutoffStr = cutoff.toISOString()

  // Orgs whose most recent contract activity (by updated_at, falling back to created_at)
  // is older than the cutoff. Orgs with zero contracts are not flagged — nothing to retain.
  const { data: orgs, error } = await serviceClient
    .from('contracts')
    .select('org_id, updated_at, created_at')

  if (error) {
    return jsonResponse({ error: error.message }, 500)
  }

  const lastActivityByOrg = new Map<string, string>()
  for (const row of orgs ?? []) {
    const activity = row.updated_at ?? row.created_at
    const current = lastActivityByOrg.get(row.org_id)
    if (!current || activity > current) lastActivityByOrg.set(row.org_id, activity)
  }

  const flaggedOrgIds = [...lastActivityByOrg.entries()]
    .filter(([, lastActivity]) => lastActivity < cutoffStr)
    .map(([orgId]) => orgId)

  for (const orgId of flaggedOrgIds) {
    await serviceClient.from('audit_logs').insert({
      org_id: orgId,
      action: 'retention_flagged',
      entity_type: 'organizations',
      entity_id: orgId,
      metadata: { retention_months: RETENTION_MONTHS, last_activity_before: cutoffStr },
    })
  }

  return jsonResponse({
    success: true,
    retention_months: RETENTION_MONTHS,
    orgs_flagged: flaggedOrgIds.length,
  })
})
