// Modulo de Cupom de Desconto (docs/CUPOM_SPEC.md), Etapa A.
//
// validateCoupon() e chamada duas vezes no mesmo fluxo: primeiro pelo
// endpoint de previa (billing-validate-coupon, nao reserva nada), depois
// de novo dentro de create-mercadopago-subscription, na mesma "transacao"
// que cria a assinatura (spec secao 4, passo 6) -- evita corrida no limite
// de usos. A reserva atomica de verdade (contagem de limite) fica em
// redeem_coupon() (RPC Postgres, mesmo espirito de claim_subscription_lock).

import type { PaymentProvider } from '../provider.ts'

// deno-lint-ignore no-explicit-any
type SupabaseClient = any // tipagem completa do supabase-js nao exportada aqui -- ver uso em outras Edge Functions do projeto

export type CouponRow = {
  id: string
  code: string
  description: string | null
  discount_type: 'percent' | 'fixed'
  discount_value: number
  duration: 'once' | 'repeating' | 'forever'
  duration_cycles: number | null
  valid_from: string
  valid_until: string | null
  max_redemptions: number | null
  max_per_organization: number
  allowed_plans: string[]
  allowed_methods: string[]
  new_customers_only: boolean
  is_active: boolean
}

export type CouponValidationResult =
  | { valid: true; coupon: CouponRow; fullAmountCents: number; discountedAmountCents: number; cyclesTotal: number | null; ruleText: string }
  | { valid: false; reason: string }

const MIN_CHARGE_CENTS = 100 // R$ 1,00 -- valor minimo pra cobrar (spec secao 2)

/** Calcula o valor com desconto, arredondado pra baixo em centavos. Pode cair abaixo do minimo -- quem chama decide o que fazer (validateCoupon rejeita). */
export function calculateDiscount(planPriceCents: number, coupon: Pick<CouponRow, 'discount_type' | 'discount_value'>): number {
  if (coupon.discount_type === 'percent') {
    return Math.floor((planPriceCents * (100 - coupon.discount_value)) / 100)
  }
  return Math.max(planPriceCents - coupon.discount_value, 0)
}

function buildRuleText(coupon: CouponRow, fullAmountCents: number, discountedAmountCents: number): string {
  const fmt = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const discountLabel = coupon.discount_type === 'percent' ? `${coupon.discount_value}%` : fmt(coupon.discount_value)

  if (coupon.duration === 'forever') {
    return `${discountLabel} de desconto para sempre. Você paga ${fmt(discountedAmountCents)}/mês.`
  }
  if (coupon.duration === 'once') {
    return `${discountLabel} de desconto na 1ª mensalidade (${fmt(discountedAmountCents)}). A partir da 2ª: ${fmt(fullAmountCents)}/mês.`
  }
  const n = coupon.duration_cycles ?? 1
  return `${discountLabel} de desconto nas ${n} primeiras mensalidades (${fmt(discountedAmountCents)}/mês). A partir da ${n + 1}ª: ${fmt(fullAmountCents)}/mês.`
}

export async function validateCoupon(
  client: SupabaseClient,
  input: { code: string; planCode: string; method: 'card' | 'pix'; organizationId: string; fullAmountCents: number },
): Promise<CouponValidationResult> {
  const code = input.code.trim().toUpperCase()
  if (!code) return { valid: false, reason: 'cupom inválido' }

  const { data: coupon, error } = await client
    .from('coupons')
    .select('*')
    .eq('code', code)
    .maybeSingle()
  if (error) throw new Error(`validateCoupon: falha ao buscar cupom ${code} — ${error.message}`)
  if (!coupon) return { valid: false, reason: 'cupom inválido' }

  const c = coupon as CouponRow
  if (!c.is_active) return { valid: false, reason: 'cupom inválido' }

  const now = Date.now()
  if (new Date(c.valid_from).getTime() > now) return { valid: false, reason: 'cupom inválido' }
  if (c.valid_until && new Date(c.valid_until).getTime() < now) return { valid: false, reason: 'cupom expirado' }

  if (!c.allowed_methods.includes(input.method)) return { valid: false, reason: 'cupom não vale para este plano' }
  if (c.allowed_plans.length > 0 && !c.allowed_plans.includes(input.planCode)) return { valid: false, reason: 'cupom não vale para este plano' }

  if (c.new_customers_only) {
    const { count, error: custErr } = await client
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', input.organizationId)
      .neq('provider', 'manual')
    if (custErr) throw new Error(`validateCoupon: falha ao checar histórico de assinaturas — ${custErr.message}`)
    if ((count ?? 0) > 0) return { valid: false, reason: 'válido só para novos clientes' }
  }

  if (c.max_redemptions != null) {
    const { count, error: totalErr } = await client
      .from('coupon_redemptions')
      .select('id', { count: 'exact', head: true })
      .eq('coupon_id', c.id)
    if (totalErr) throw new Error(`validateCoupon: falha ao contar resgates — ${totalErr.message}`)
    if ((count ?? 0) >= c.max_redemptions) return { valid: false, reason: 'cupom esgotado' }
  }

  const { count: orgCount, error: orgErr } = await client
    .from('coupon_redemptions')
    .select('id', { count: 'exact', head: true })
    .eq('coupon_id', c.id)
    .eq('organization_id', input.organizationId)
  if (orgErr) throw new Error(`validateCoupon: falha ao contar resgates da organização — ${orgErr.message}`)
  if ((orgCount ?? 0) >= c.max_per_organization) return { valid: false, reason: 'cupom já utilizado' }

  const discountedAmountCents = calculateDiscount(input.fullAmountCents, c)
  if (discountedAmountCents < MIN_CHARGE_CENTS) return { valid: false, reason: 'cupom inválido' }

  const cyclesTotal = c.duration === 'once' ? 1 : c.duration === 'repeating' ? c.duration_cycles : null
  return {
    valid: true,
    coupon: c,
    fullAmountCents: input.fullAmountCents,
    discountedAmountCents,
    cyclesTotal,
    ruleText: buildRuleText(c, input.fullAmountCents, discountedAmountCents),
  }
}

/**
 * Chamada a cada pagamento APROVADO de uma assinatura (webhooks.ts, ao lado
 * de advanceSubscriptionPeriod). No-op se a assinatura nao tem resgate
 * ativo. Grava discount_cents/coupon_redemption_id no pagamento, consome 1
 * ciclo, e -- se os ciclos acabaram -- reverte o preco cheio no Mercado
 * Pago (so pra assinatura de cartao; Pix nao tem preapproval, o job
 * generate-pix-renewals so para de aplicar desconto sozinho, Etapa B).
 */
export async function applyCouponToPayment(
  client: SupabaseClient,
  provider: PaymentProvider,
  input: { subscriptionId: string; paymentId?: string; actor: string },
): Promise<void> {
  const { data: redemption, error } = await client
    .from('coupon_redemptions')
    .select('id, full_amount_cents, discounted_amount_cents, cycles_total, cycles_used, status')
    .eq('subscription_id', input.subscriptionId)
    .eq('status', 'active')
    .maybeSingle()
  if (error) throw new Error(`applyCouponToPayment: falha ao buscar resgate da assinatura ${input.subscriptionId} — ${error.message}`)
  if (!redemption) return // sem cupom ativo nesta assinatura -- nada a fazer

  const discountCents = redemption.full_amount_cents - redemption.discounted_amount_cents
  if (input.paymentId) {
    const { error: payErr } = await client
      .from('payments')
      .update({ discount_cents: discountCents, coupon_redemption_id: redemption.id })
      .eq('id', input.paymentId)
    if (payErr) console.error(`applyCouponToPayment: falha ao gravar desconto no pagamento ${input.paymentId} (não bloqueante):`, payErr)
  }

  const cyclesUsed = redemption.cycles_used + 1
  const exhausted = redemption.cycles_total != null && cyclesUsed >= redemption.cycles_total

  const { error: updateErr } = await client
    .from('coupon_redemptions')
    .update({
      cycles_used: cyclesUsed,
      status: exhausted ? 'completed' : 'active',
      completed_at: exhausted ? new Date().toISOString() : null,
    })
    .eq('id', redemption.id)
  if (updateErr) throw new Error(`applyCouponToPayment: falha ao atualizar resgate ${redemption.id} — ${updateErr.message}`)

  if (!exhausted) return

  const { data: sub } = await client
    .from('subscriptions')
    .select('organization_id, payment_method, provider_subscription_id')
    .eq('id', input.subscriptionId)
    .maybeSingle()

  if (sub?.payment_method === 'card' && sub.provider_subscription_id) {
    try {
      await provider.updateSubscriptionAmount({ providerSubscriptionId: sub.provider_subscription_id, amount: redemption.full_amount_cents })
    } catch (err) {
      // Nao bloqueante -- o job coupon-sync (Etapa B) e a rede de seguranca
      // pra quando essa chamada falhar (ex.: timeout do MP).
      console.error(`applyCouponToPayment: falha ao reverter preço cheio no Mercado Pago (assinatura ${sub.provider_subscription_id}), coupon-sync corrige depois:`, err)
    }
  }

  await client.from('billing_audit_log').insert({
    organization_id: sub?.organization_id ?? null,
    entity: 'coupon_redemption',
    entity_id: redemption.id,
    from_status: 'active',
    to_status: 'completed',
    actor: input.actor,
    metadata: { reason: 'cycles_exhausted', full_amount_cents: redemption.full_amount_cents },
  })
}
