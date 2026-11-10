// Modulo de Pagamentos, Fase 1 -- upsert de pagamentos so-para-frente
// (Principio 4 da spec: um pagamento nunca regride de 'approved' para um
// estado anterior; so avanca para refunded/partially_refunded/in_mediation/
// charged_back a partir dai).

import { centsToBRL } from '../money.ts'

// deno-lint-ignore no-explicit-any
type SupabaseClient = any // tipagem completa do supabase-js nao exportada aqui -- ver uso em outras Edge Functions do projeto

export type PaymentStatus =
  | 'pending' | 'approved' | 'rejected' | 'cancelled' | 'expired'
  | 'refunded' | 'partially_refunded' | 'in_mediation' | 'charged_back'

// Uma vez 'approved', so estes destinos sao aceitos -- nunca de volta pra
// pending/rejected/cancelled/expired. Estados pre-approved podem seguir seu
// proprio fluxo normalmente.
const POST_APPROVAL_ALLOWED: ReadonlySet<PaymentStatus> = new Set([
  'approved', 'refunded', 'partially_refunded', 'in_mediation', 'charged_back',
])

export function isForwardPaymentTransition(from: PaymentStatus, to: PaymentStatus): boolean {
  if (from === to) return true // idempotente
  if (from !== 'approved') return true // antes de approved, qualquer destino documentado pelo provider e aceito
  return POST_APPROVAL_ALLOWED.has(to)
}

/**
 * Recibo pro cliente ver em Configurações > Plano > Recibos
 * (billing_receipts, tabela pré-existente do fluxo manual de ativação).
 * Só é chamado na transição PARA 'approved' (nunca em reprocessamento
 * idempotente do mesmo pagamento já aprovado) -- um recibo por pagamento
 * aprovado, não um por webhook recebido.
 */
async function insertReceipt(client: SupabaseClient, organizationId: string, amountCents: number, method: 'card' | 'pix', subscriptionId?: string): Promise<void> {
  let planName: string | null = null
  if (subscriptionId) {
    const { data: sub } = await client
      .from('subscriptions')
      .select('billing_plans!plan_id(name)')
      .eq('id', subscriptionId)
      .maybeSingle()
    planName = sub?.billing_plans?.name ?? null
  }

  const methodLabel = method === 'pix' ? 'Pix' : 'cartão'
  const description = planName
    ? `Pagamento aprovado — Plano ${planName} (${methodLabel})`
    : `Pagamento aprovado (${methodLabel})`

  const { error } = await client.from('billing_receipts').insert({
    org_id: organizationId,
    amount_cents: amountCents,
    description,
  })
  if (error) console.error('insertReceipt: falha ao gravar recibo (não bloqueante):', error)
}

/**
 * Enfileira a nota fiscal (fiscal_invoices, spec Peça 10) na mesma
 * transição pra 'approved' que já gera o recibo -- quem emite de verdade é
 * o job issue-invoices. Idempotente por payment_id (unique).
 */
async function enqueueFiscalInvoice(client: SupabaseClient, organizationId: string, paymentId: string): Promise<void> {
  const { error } = await client.from('fiscal_invoices').insert({
    organization_id: organizationId,
    payment_id: paymentId,
    provider: 'mock', // unico InvoiceProvider implementado ate a Fase 5c -- ver docs/billing-decisions.md
    status: 'queued',
  })
  // payment_id e unique -- 23505 em reprocessamento idempotente e esperado.
  if (error && error.code !== '23505') console.error('enqueueFiscalInvoice: falha ao enfileirar nota fiscal (não bloqueante):', error)
}

/**
 * E-mail "pagamento confirmado" (template Resend, mesmo padrão de
 * dunning/index.ts) -- só na transição PARA 'approved', mesma condição
 * que já dispara o recibo e a nota fiscal.
 */
async function sendPaymentConfirmedEmail(client: SupabaseClient, organizationId: string, amountCents: number, subscriptionId?: string): Promise<void> {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) return

  const { data: customer } = await client
    .from('billing_customers')
    .select('email, legal_name')
    .eq('organization_id', organizationId)
    .maybeSingle()
  if (!customer?.email) return

  let planName = 'Ponderum'
  if (subscriptionId) {
    const { data: sub } = await client
      .from('subscriptions')
      .select('billing_plans!plan_id(name)')
      .eq('id', subscriptionId)
      .maybeSingle()
    planName = sub?.billing_plans?.name ?? planName
  }

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Ponderum <contato@ponderum.com>',
        to: [customer.email],
        template: {
          id: 'pagamento-confirmado',
          variables: {
            NOME: customer.legal_name ?? 'cliente',
            PLANO: planName,
            VALOR: centsToBRL(amountCents),
            DATA: new Date().toLocaleDateString('pt-BR'),
          },
        },
      }),
      signal: AbortSignal.timeout(8000),
    })
  } catch (err) {
    console.error('applyPaymentUpdate: falha ao enviar e-mail de confirmação de pagamento:', err)
  }
}

export type ApplyPaymentUpdateInput = {
  organizationId: string
  provider: string
  providerPaymentId: string
  status: PaymentStatus
  amount: number // centavos
  method: 'card' | 'pix'
  netAmount?: number
  feeAmount?: number
  moneyReleaseDate?: string
  approvedAt?: string
  externalReference?: string
  idempotencyKey?: string
  subscriptionId?: string
  rawLastResponse?: unknown
}

/**
 * Upsert de `payments`. Tenta achar a linha por (provider,
 * provider_payment_id) -- ja vinculada antes. Se nao achar e vier
 * `externalReference`, tenta achar pelo nosso proprio `payments.id` (e o
 * que mandamos como external_reference na criacao, via checkout -- spec
 * secao 4, nao e uma coluna: o id da linha E a referencia). Isso cobre o
 * primeiro contato do gateway com um pagamento que o checkout ja criou
 * como 'pending' mas cujo provider_payment_id so chega agora (caso real:
 * subscription_authorized_payment). Se nenhuma linha existir, cria uma
 * nova (caminho so para quando nao houve checkout antes -- ex.: simulador
 * de teste -- por isso `idempotency_key` e gerada aqui se nao fornecida).
 * Se achada e em 'approved', ignora silenciosamente update que regrediria
 * o status (Principio 4) -- loga o bloqueio, nao lanca erro, porque um
 * webhook atrasado/fora de ordem chegando depois e esperado.
 */
export async function applyPaymentUpdate(
  client: SupabaseClient,
  input: ApplyPaymentUpdateInput,
): Promise<{ applied: boolean; reason?: string }> {
  const { data: byProviderId, error: fetchErr } = await client
    .from('payments')
    .select('id, status')
    .eq('provider', input.provider)
    .eq('provider_payment_id', input.providerPaymentId)
    .maybeSingle()
  if (fetchErr) throw new Error(`applyPaymentUpdate: erro ao buscar pagamento ${input.provider}/${input.providerPaymentId} — ${fetchErr.message}`)

  let existing = byProviderId
  if (!existing && input.externalReference) {
    const { data: byExternalRef, error: refErr } = await client
      .from('payments')
      .select('id, status')
      .eq('id', input.externalReference)
      .is('provider_payment_id', null)
      .maybeSingle()
    if (refErr) throw new Error(`applyPaymentUpdate: erro ao buscar pagamento por external_reference ${input.externalReference} — ${refErr.message}`)
    existing = byExternalRef
  }

  if (existing) {
    const from = existing.status as PaymentStatus
    if (!isForwardPaymentTransition(from, input.status)) {
      console.warn(`applyPaymentUpdate: ignorando regressão de status "${from}" -> "${input.status}" para pagamento ${existing.id} (Princípio 4)`)
      return { applied: false, reason: `regressão bloqueada: ${from} -> ${input.status}` }
    }

    const { error: updateErr } = await client
      .from('payments')
      .update({
        provider_payment_id: input.providerPaymentId,
        status: input.status,
        net_cents: input.netAmount ?? null,
        fee_cents: input.feeAmount ?? null,
        money_release_date: input.moneyReleaseDate ?? null,
        approved_at: input.approvedAt ?? null,
        raw_last_response: input.rawLastResponse ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)

    if (updateErr) throw new Error(`applyPaymentUpdate: falha ao atualizar pagamento ${existing.id} — ${updateErr.message}`)
    if (input.status === 'approved' && from !== 'approved') {
      await insertReceipt(client, input.organizationId, input.amount, input.method, input.subscriptionId)
      await enqueueFiscalInvoice(client, input.organizationId, existing.id)
      await sendPaymentConfirmedEmail(client, input.organizationId, input.amount, input.subscriptionId)
    }
    return { applied: true }
  }

  const { data: inserted, error: insertErr } = await client.from('payments').insert({
    organization_id: input.organizationId,
    provider: input.provider,
    provider_payment_id: input.providerPaymentId,
    subscription_id: input.subscriptionId ?? null,
    idempotency_key: input.idempotencyKey ?? crypto.randomUUID(),
    status: input.status,
    amount_cents: input.amount,
    net_cents: input.netAmount ?? null,
    fee_cents: input.feeAmount ?? null,
    method: input.method,
    money_release_date: input.moneyReleaseDate ?? null,
    approved_at: input.approvedAt ?? null,
    raw_last_response: input.rawLastResponse ?? null,
  }).select('id').single()

  if (insertErr) throw new Error(`applyPaymentUpdate: falha ao inserir pagamento ${input.provider}/${input.providerPaymentId} — ${insertErr.message}`)
  if (input.status === 'approved') {
    await insertReceipt(client, input.organizationId, input.amount, input.method, input.subscriptionId)
    await enqueueFiscalInvoice(client, input.organizationId, inserted.id)
    await sendPaymentConfirmedEmail(client, input.organizationId, input.amount, input.subscriptionId)
  }
  return { applied: true }
}
