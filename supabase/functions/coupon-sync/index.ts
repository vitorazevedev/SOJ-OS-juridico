import { createClient } from 'npm:@supabase/supabase-js@2'
import { getPaymentProvider } from '../_shared/billing/providers/index.ts'

// Modulo de Cupom de Desconto (docs/CUPOM_SPEC.md, secao 5) -- rede de
// seguranca diaria: "procura resgates com ciclos esgotados e assinatura
// ainda com valor descontado no Mercado Pago (consulta o preapproval) e
// corrige. Tambem alerta no manager se a correcao falhar." O caminho
// normal (applyCouponToPayment, em webhooks.ts) ja reverte o valor no
// momento certo -- este job so cobre falha nesse caminho (ex.: timeout do
// MP na hora exata da reversao).

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

async function sendCorrectionFailedAlert(subscriptionId: string, redemptionId: string, errorMessage: string): Promise<void> {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) return
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Ponderum <contato@ponderum.com>',
        to: ['contato@ponderum.com'],
        subject: '⚠️ Correção de cupom falhou — Ponderum',
        html: `
          <p>O job coupon-sync encontrou uma assinatura com cupom esgotado que ainda cobra valor com desconto no Mercado Pago, e a correção automática falhou.</p>
          <ul>
            <li><strong>Assinatura:</strong> ${subscriptionId}</li>
            <li><strong>Resgate:</strong> ${redemptionId}</li>
            <li><strong>Erro:</strong> ${errorMessage}</li>
          </ul>
          <p>Verifique manualmente no painel do Mercado Pago.</p>
        `,
      }),
      signal: AbortSignal.timeout(8000),
    })
  } catch (err) {
    console.error('coupon-sync: falha ao enviar alerta de correção:', err)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const cronSecret = Deno.env.get('CRON_SECRET')
  if (req.headers.get('x-cron-secret') !== cronSecret) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const provider = getPaymentProvider()
  const serviceClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: redemptions, error } = await serviceClient
    .from('coupon_redemptions')
    .select('id, full_amount_cents, subscriptions!subscription_id(id, organization_id, payment_method, provider_subscription_id)')
    .eq('status', 'completed')

  if (error) console.error('coupon-sync: falha ao buscar resgates concluídos:', error)

  let checked = 0
  let corrected = 0
  let failed = 0

  for (const redemption of redemptions ?? []) {
    const sub = redemption.subscriptions as { id: string; organization_id: string; payment_method: string; provider_subscription_id: string | null } | null
    if (!sub || sub.payment_method !== 'card' || !sub.provider_subscription_id) continue
    checked++

    try {
      const providerSub = await provider.getSubscription(sub.provider_subscription_id)
      if (providerSub.amount != null && providerSub.amount !== redemption.full_amount_cents) {
        await provider.updateSubscriptionAmount({ providerSubscriptionId: sub.provider_subscription_id, amount: redemption.full_amount_cents })
        await serviceClient.from('billing_audit_log').insert({
          organization_id: sub.organization_id,
          entity: 'coupon_redemption',
          entity_id: redemption.id,
          from_status: null,
          to_status: null,
          actor: 'job:coupon-sync',
          metadata: { change: 'price_corrected', from_amount_cents: providerSub.amount, to_amount_cents: redemption.full_amount_cents },
        })
        corrected++
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`coupon-sync: falha ao corrigir assinatura ${sub.id} (resgate ${redemption.id}):`, err)
      await sendCorrectionFailedAlert(sub.id, redemption.id, message)
      failed++
    }
  }

  return jsonResponse({ checked, corrected, failed })
})
