import { createClient } from 'npm:@supabase/supabase-js@2'
import { getPaymentProvider } from '../_shared/billing/providers/index.ts'
import { applyPaymentUpdate, type PaymentStatus } from '../_shared/billing/domain/payments.ts'

// Modulo de Pagamentos, Fase 5b -- conciliacao (spec Peca 9, secao 9:
// "reconcile | diario 03:00"). Rede de seguranca caso algum webhook se
// perca: re-consulta o gateway pra cada pagamento dos ultimos 35 dias e
// aplica divergencia via applyPaymentUpdate (ja so-para-frente).
//
// ACHADO REAL (encontrado testando ao vivo): em PAYMENT_PROVIDER=mock,
// MockProvider.getPayment() sem override devolve sempre um valor neutro
// ('pending') -- os overrides (simulatePayment) so vivem durante UM
// request, nao persistem entre invocacoes diferentes do job. Isso nao e
// "nao acha nada e inofensivo": pra pagamentos que NAO estao em
// 'approved' (rejected, charged_back, refunded...), o guard so-para-frente
// de applyPaymentUpdate so protege contra regredir de 'approved' -- um
// 'rejected'/'charged_back' sendo "corrigido" de volta pra 'pending' por
// esse sinal falso do mock passa batido e CORROMPE dado real. Por isso o
// job recusa rodar em mock -- a logica so faz sentido com um gateway de
// verdade (Fase 6), onde getPayment() reflete o estado real.

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

const LOOKBACK_DAYS = 35

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const cronSecret = Deno.env.get('CRON_SECRET')
  if (req.headers.get('x-cron-secret') !== cronSecret) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const provider = getPaymentProvider()
  if (provider.name !== 'mercadopago') {
    // mock nao tem estado persistido real -- rodar aqui so corromperia
    // pagamentos nao-approved de volta pro default neutro 'pending'.
    return jsonResponse({ checked: 0, divergences: 0, skipped: `provider '${provider.name}' não suporta reconciliação real` })
  }

  const serviceClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: payments, error } = await serviceClient
    .from('payments')
    .select('id, organization_id, provider_payment_id, subscription_id, status, method')
    .not('provider_payment_id', 'is', null)
    .gte('created_at', new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString())
    .limit(200)

  if (error) {
    console.error('reconcile: falha ao buscar pagamentos:', error)
    return jsonResponse({ error: 'erro ao buscar pagamentos' }, 500)
  }

  let checked = 0
  let divergences = 0

  for (const row of payments ?? []) {
    checked++
    try {
      const remote = await provider.getPayment(row.provider_payment_id!)
      if (remote.status === row.status) continue

      const { applied } = await applyPaymentUpdate(serviceClient, {
        organizationId: row.organization_id,
        provider: provider.name,
        providerPaymentId: row.provider_payment_id!,
        status: remote.status as PaymentStatus,
        amount: remote.amount,
        method: row.method as 'card' | 'pix',
        netAmount: remote.netAmount,
        feeAmount: remote.feeAmount,
        moneyReleaseDate: remote.moneyReleaseDate?.toISOString(),
        approvedAt: remote.approvedAt?.toISOString(),
        subscriptionId: row.subscription_id ?? undefined,
        rawLastResponse: remote.raw,
      })

      if (applied) {
        divergences++
        await serviceClient.from('billing_audit_log').insert({
          organization_id: row.organization_id,
          entity: 'payment',
          entity_id: row.id,
          from_status: row.status,
          to_status: remote.status,
          actor: 'job:reconcile',
          metadata: { change: 'reconcile_divergence' },
        })
      }
    } catch (err) {
      console.error(`reconcile: falha ao conciliar pagamento ${row.id}:`, err)
    }
  }

  return jsonResponse({ checked, divergences })
})
