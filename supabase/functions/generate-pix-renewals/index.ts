import { createClient } from 'npm:@supabase/supabase-js@2'
import { getPaymentProvider } from '../_shared/billing/providers/index.ts'
import { DUNNING_GRACE_PERIOD_DAYS } from '../_shared/billing/domain/subscriptions.ts'

// Modulo de Pagamentos, spec secao 9: job diario que nunca foi construido
// ("generate-pix-renewals | diario 08:00 | Cria Pix de renovacao D-5").
// A recorrencia de uma assinatura Pix e NOSSA (nao existe preapproval pra
// Pix no Mercado Pago) -- este job gera a cobranca da proxima mensalidade
// 5 dias antes do vencimento, com validade ate o fim da carencia (mesma
// DUNNING_GRACE_PERIOD_DAYS do dunning). Aplica o desconto do cupom
// (docs/CUPOM_SPEC.md, secao 5) se o resgate ainda estiver ativo -- o
// consumo do ciclo acontece depois, quando o Pix for aprovado, pelo MESMO
// caminho de webhook que ja trata cartao (processWebhookEvent ->
// advanceSubscriptionPeriod + applyCouponToPayment), ja que o pagamento e
// gravado com subscription_id igual ao checkout.
//
// Nota: Pix avulso esta pausado em producao desde 2026-11-11
// (docs/billing-decisions.md -- 401 "Unauthorized use of live
// credentials" no /v1/payments do Mercado Pago). Este job fica pronto,
// mas so vai funcionar de verdade quando o Pix for reativado.

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

const RENEWAL_LEAD_DAYS = 5

function fmtBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

async function sendPixRenewalEmail(to: string, nome: string, amountCents: number, paymentId: string, resendKey: string): Promise<void> {
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Ponderum <contato@ponderum.com>',
        to: [to],
        subject: 'Sua renovação Pix está pronta — Ponderum',
        html: `
          <p>Olá, ${nome}.</p>
          <p>Sua próxima mensalidade (${fmtBRL(amountCents)}) já está disponível para pagamento via Pix.</p>
          <p><a href="https://app.ponderum.com/checkout/pix/${paymentId}">Pagar agora</a></p>
        `,
      }),
      signal: AbortSignal.timeout(8000),
    })
  } catch (err) {
    console.error('generate-pix-renewals: falha ao enviar e-mail:', err)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const cronSecret = Deno.env.get('CRON_SECRET')
  if (req.headers.get('x-cron-secret') !== cronSecret) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const resendKey = Deno.env.get('RESEND_API_KEY')
  const provider = getPaymentProvider()
  const serviceClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const targetDate = new Date(Date.now() + RENEWAL_LEAD_DAYS * 24 * 60 * 60 * 1000)
  const windowStart = new Date(targetDate); windowStart.setHours(0, 0, 0, 0)
  const windowEnd = new Date(windowStart); windowEnd.setDate(windowEnd.getDate() + 1)

  const { data: dueSubs, error: dueErr } = await serviceClient
    .from('subscriptions')
    .select('id, organization_id, current_period_end, billing_plans!plan_id(code, price_cents, interval)')
    .eq('payment_method', 'pix')
    .eq('status', 'active')
    .gte('current_period_end', windowStart.toISOString())
    .lt('current_period_end', windowEnd.toISOString())

  if (dueErr) console.error('generate-pix-renewals: falha ao buscar assinaturas Pix a renovar:', dueErr)

  let created = 0
  let skipped = 0
  let failed = 0

  for (const sub of dueSubs ?? []) {
    const plan = sub.billing_plans as { code: string; price_cents: number; interval: string } | null
    if (!plan) continue

    // Idempotencia: ja existe uma cobranca pra este ciclo (period_start =
    // current_period_end, igual ao que criamos abaixo)? Uma linha sem
    // provider_payment_id e um QR que nunca saiu (createPixPayment falhou
    // numa tentativa anterior) -- apaga e tenta de novo em vez de pular
    // pra sempre.
    const { data: existing } = await serviceClient
      .from('payments')
      .select('id, provider_payment_id')
      .eq('subscription_id', sub.id)
      .eq('period_start', sub.current_period_end)
      .maybeSingle()
    if (existing?.provider_payment_id) { skipped++; continue }
    if (existing) await serviceClient.from('payments').delete().eq('id', existing.id)

    try {
      // Cupom (docs/CUPOM_SPEC.md, secao 5): aplica o desconto so se o
      // resgate estiver ativo e ainda tiver ciclo disponivel.
      let chargeAmountCents = plan.price_cents
      const { data: redemption } = await serviceClient
        .from('coupon_redemptions')
        .select('discounted_amount_cents, cycles_total, cycles_used')
        .eq('subscription_id', sub.id)
        .eq('status', 'active')
        .maybeSingle()
      if (redemption && (redemption.cycles_total == null || redemption.cycles_used < redemption.cycles_total)) {
        chargeAmountCents = redemption.discounted_amount_cents
      }

      const { data: customer } = await serviceClient
        .from('billing_customers')
        .select('email, legal_name, document_type, document_number')
        .eq('organization_id', sub.organization_id)
        .maybeSingle()
      if (!customer?.email) { skipped++; continue }

      const periodEnd = new Date(sub.current_period_end)
      const nextPeriodEnd = new Date(periodEnd)
      if (plan.interval === 'year') nextPeriodEnd.setFullYear(nextPeriodEnd.getFullYear() + 1)
      else nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1)

      const expiresAt = new Date(periodEnd.getTime() + DUNNING_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000)

      const { data: paymentRow, error: paymentErr } = await serviceClient
        .from('payments')
        .insert({
          organization_id: sub.organization_id,
          provider: provider.name,
          subscription_id: sub.id,
          idempotency_key: crypto.randomUUID(),
          status: 'pending',
          amount_cents: chargeAmountCents,
          method: 'pix',
          period_start: periodEnd.toISOString(),
          period_end: nextPeriodEnd.toISOString(),
          pix_expires_at: expiresAt.toISOString(),
        })
        .select('id')
        .single()
      if (paymentErr || !paymentRow) throw new Error(`falha ao criar pagamento: ${paymentErr?.message}`)

      const pix = await provider.createPixPayment({
        idempotencyKey: crypto.randomUUID(),
        amount: chargeAmountCents,
        description: `Ponderum — Plano ${plan.code} (renovação)`,
        payer: { email: customer.email, name: customer.legal_name ?? '', document: customer.document_number ?? '', documentType: (customer.document_type ?? 'CPF') as 'CPF' | 'CNPJ' },
        expiresAt,
        externalReference: paymentRow.id,
      })

      await serviceClient
        .from('payments')
        .update({
          provider_payment_id: pix.providerPaymentId,
          pix_qr_code: pix.pix.qrCode,
          pix_qr_code_base64: pix.pix.qrCodeBase64,
        })
        .eq('id', paymentRow.id)

      if (resendKey) await sendPixRenewalEmail(customer.email, customer.legal_name ?? 'cliente', chargeAmountCents, paymentRow.id, resendKey)
      created++
    } catch (err) {
      console.error(`generate-pix-renewals: falha ao gerar renovação para a assinatura ${sub.id}:`, err)
      failed++
    }
  }

  return jsonResponse({ checked: dueSubs?.length ?? 0, created, skipped, failed })
})
