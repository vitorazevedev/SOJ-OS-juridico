import { createClient } from 'npm:@supabase/supabase-js@2'
import { transitionSubscription } from '../_shared/billing/domain/subscriptions.ts'

// Modulo de Pagamentos, Fase 4a -- job agendado (spec secao 9) que fecha
// de verdade assinaturas com cancelamento agendado cujo periodo ja
// terminou (cancel_at_period_end=true, status ainda 'active'). Roda de
// hora em hora -- ver migration de agendamento.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  // verify_jwt=false (pg_cron chama sem Authorization) -- exige o segredo
  // compartilhado que o proprio job de cron envia, mesmo padrao de
  // resume-stuck-analyses/index.ts.
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (req.headers.get('x-cron-secret') !== cronSecret) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const serviceClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: due, error } = await serviceClient
    .from('subscriptions')
    .select('id')
    .eq('status', 'active')
    .eq('cancel_at_period_end', true)
    .lt('current_period_end', new Date().toISOString())

  if (error) {
    console.error('close-canceled: falha ao buscar assinaturas vencidas:', error)
    return jsonResponse({ error: 'erro ao buscar assinaturas' }, 500)
  }

  let closed = 0
  for (const row of due ?? []) {
    try {
      await transitionSubscription(serviceClient, row.id, 'canceled', 'job:close-canceled', {})
      closed++
    } catch (err) {
      console.error(`close-canceled: falha ao fechar assinatura ${row.id}:`, err)
    }
  }

  return jsonResponse({ checked: due?.length ?? 0, closed })
})
