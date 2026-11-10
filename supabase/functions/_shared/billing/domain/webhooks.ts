// Modulo de Pagamentos, Fase 2 -- gravacao e processamento de webhooks
// (spec secao 4/6, Peca 2+3). billing-webhook e billing-dev-simulator
// chamam as MESMAS funcoes daqui: o simulador testa o processador real,
// nao um caminho paralelo.

import type { PaymentProvider, NormalizedWebhookEvent } from '../provider.ts'
import { applyPaymentUpdate, isForwardPaymentTransition, type PaymentStatus } from './payments.ts'
import { transitionSubscription } from './subscriptions.ts'
import { centsToBRL } from '../money.ts'

// E-mail de alerta pro time (nao pro cliente) quando um chargeback novo
// chega -- mesmo padrao de envio via Resend ja usado em dunning/index.ts
// e domain/invoices.ts, com skip gracioso se RESEND_API_KEY nao estiver
// configurado. Sem lista de distribuicao de staff ainda -- reaproveita o
// mesmo contato@ponderum.com ja usado como "from" em todo o resto do
// projeto, que e a caixa que a equipe acompanha.
async function sendChargebackAlertEmail(orgName: string, amountCents: number, reason: string | null, documentationDueAt: string | null): Promise<void> {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) return
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Ponderum <contato@ponderum.com>',
        to: ['contato@ponderum.com'],
        template: {
          id: 'alerta-de-chargeback',
          variables: {
            ORGANIZACAO: orgName,
            VALOR: centsToBRL(amountCents),
            MOTIVO: reason ?? 'não informado',
            PRAZO_DOCUMENTACAO: documentationDueAt ? new Date(documentationDueAt).toLocaleDateString('pt-BR') : '--/--/----',
          },
        },
      }),
      signal: AbortSignal.timeout(8000),
    })
  } catch (err) {
    console.error('processWebhookEvent: falha ao enviar alerta de chargeback:', err)
  }
}

// deno-lint-ignore no-explicit-any
type SupabaseClient = any // tipagem completa do supabase-js nao exportada aqui -- ver uso em outras Edge Functions do projeto

export type WebhookEventRow = {
  id: string
  provider: string
  provider_event_id: string | null
  resource_type: string
  resource_id: string
  action: string | null
  signature_valid: boolean
  payload: unknown
  status: 'received' | 'processing' | 'processed' | 'ignored' | 'failed'
  attempts: number
  last_error: string | null
}

/**
 * Grava o evento em webhook_events com unique(provider, provider_event_id).
 * Evento repetido (reenvio do gateway) nao falha -- devolve a linha
 * existente com isNew=false, pra quem chamou saber que nao precisa
 * (re)processar (Peca 3, camada 1 da spec).
 */
export async function recordWebhookEvent(
  client: SupabaseClient,
  provider: string,
  event: NormalizedWebhookEvent,
  payload: unknown,
  signatureValid: boolean,
): Promise<{ row: WebhookEventRow; isNew: boolean }> {
  const { data: inserted, error: insertErr } = await client
    .from('webhook_events')
    .insert({
      provider,
      provider_event_id: event.providerEventId,
      resource_type: event.resourceType,
      resource_id: event.resourceId,
      action: event.action ?? null,
      signature_valid: signatureValid,
      payload,
    })
    .select()
    .single()

  if (!insertErr) {
    return { row: inserted as WebhookEventRow, isNew: true }
  }

  // 23505 = unique_violation -- evento repetido, esperado e nao
  // excepcional (o gateway reenvia ate receber 200).
  if (insertErr.code !== '23505') {
    throw new Error(`recordWebhookEvent: falha ao gravar evento ${provider}/${event.providerEventId} — ${insertErr.message}`)
  }

  const { data: existing, error: fetchErr } = await client
    .from('webhook_events')
    .select()
    .eq('provider', provider)
    .eq('provider_event_id', event.providerEventId)
    .single()

  if (fetchErr || !existing) {
    throw new Error(`recordWebhookEvent: evento duplicado ${provider}/${event.providerEventId} mas não encontrado ao reler — ${fetchErr?.message}`)
  }

  return { row: existing as WebhookEventRow, isNew: false }
}

export type WebhookRoutingAction =
  | 'apply_payment' | 'apply_subscription' | 'apply_subscription_payment' | 'apply_chargeback' | 'ignore'

/** Roteamento por resource_type (tabela da spec, secao 6, Peca 2). Funcao pura, testavel sem banco. */
export function routeWebhookResourceType(resourceType: string): WebhookRoutingAction {
  switch (resourceType) {
    case 'payment': return 'apply_payment'
    case 'subscription_payment': return 'apply_subscription_payment'
    case 'subscription': return 'apply_subscription'
    case 'chargeback': return 'apply_chargeback'
    default: return 'ignore'
  }
}

type PaymentLink = { organization_id: string; subscription_id: string | null }

/**
 * Acha a linha de `payments` já existente pra este pagamento -- por
 * (provider, provider_payment_id) se já vinculada antes, ou por
 * payments.id = external_reference (linha que o checkout criou
 * 'pending' com provider_payment_id ainda nulo -- mesma lógica de
 * fallback usada em applyPaymentUpdate). Devolve organization_id E
 * subscription_id: o vínculo com a assinatura, pra Pix, vive nessa
 * coluna (não em provider.getSubscription), já que não existe
 * "provider_subscription_id" nenhum num pagamento Pix avulso.
 */
async function lookupPaymentLink(client: SupabaseClient, provider: string, providerPaymentId: string, externalReference?: string): Promise<PaymentLink | null> {
  const { data: byProviderId } = await client
    .from('payments')
    .select('organization_id, subscription_id')
    .eq('provider', provider)
    .eq('provider_payment_id', providerPaymentId)
    .maybeSingle()
  if (byProviderId) return byProviderId

  if (externalReference) {
    const { data: byExternalRef } = await client
      .from('payments')
      .select('organization_id, subscription_id')
      .eq('id', externalReference)
      .is('provider_payment_id', null)
      .maybeSingle()
    if (byExternalRef) return byExternalRef
  }
  return null
}

async function lookupSubscriptionByProviderId(client: SupabaseClient, provider: string, providerSubscriptionId: string): Promise<{ id: string; organization_id: string; status: string } | null> {
  const { data } = await client
    .from('subscriptions')
    .select('id, organization_id, status')
    .eq('provider', provider)
    .eq('provider_subscription_id', providerSubscriptionId)
    .maybeSingle()
  return data ?? null
}

async function lookupSubscriptionById(client: SupabaseClient, subscriptionId: string): Promise<{ id: string; organization_id: string; status: string } | null> {
  const { data } = await client
    .from('subscriptions')
    .select('id, organization_id, status')
    .eq('id', subscriptionId)
    .maybeSingle()
  return data ?? null
}

/**
 * Estende current_period_end em 1 intervalo do plano a partir do periodo
 * anterior (nunca de now(), pra nao "perder dias" em pagamento atrasado -
 * spec Peca 5) e reativa a assinatura se ela nao estiver 'active'.
 */
async function advanceSubscriptionPeriod(client: SupabaseClient, subscriptionId: string, actor: string): Promise<void> {
  const { data: sub, error } = await client
    .from('subscriptions')
    .select('organization_id, status, current_period_end, plan_id, pending_plan_id, billing_plans!plan_id(interval)')
    .eq('id', subscriptionId)
    .single()
  if (error || !sub) throw new Error(`advanceSubscriptionPeriod: assinatura ${subscriptionId} não encontrada`)

  const interval = sub.billing_plans?.interval === 'year' ? 'year' : 'month'
  const base = sub.current_period_end ? new Date(sub.current_period_end) : new Date()
  const nextEnd = new Date(base)
  if (interval === 'year') nextEnd.setFullYear(nextEnd.getFullYear() + 1)
  else nextEnd.setMonth(nextEnd.getMonth() + 1)

  const { error: updateErr } = await client
    .from('subscriptions')
    .update({
      current_period_start: base.toISOString(),
      current_period_end: nextEnd.toISOString(),
      past_due_since: null,
      grace_period_ends_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId)
  if (updateErr) throw new Error(`advanceSubscriptionPeriod: falha ao estender período — ${updateErr.message}`)

  if (sub.status !== 'active') {
    await transitionSubscription(client, subscriptionId, 'active', actor, { reason: 'renewal_approved' })
  }

  // Downgrade agendado (Peca 5) -- so vale a partir do proximo ciclo,
  // que e literalmente agora: toda renovacao aprovada passa por aqui.
  if (sub.pending_plan_id) {
    const { error: planChangeErr } = await client
      .from('subscriptions')
      .update({ plan_id: sub.pending_plan_id, pending_plan_id: null, updated_at: new Date().toISOString() })
      .eq('id', subscriptionId)
    if (planChangeErr) {
      console.error(`advanceSubscriptionPeriod: falha ao aplicar downgrade pendente da assinatura ${subscriptionId}:`, planChangeErr)
    } else {
      await client.from('billing_audit_log').insert({
        organization_id: sub.organization_id,
        entity: 'subscription',
        entity_id: subscriptionId,
        from_status: null,
        to_status: null,
        actor,
        metadata: { change: 'downgrade_applied', from_plan_id: sub.plan_id, to_plan_id: sub.pending_plan_id },
      })
    }
  }
}

/**
 * Processa uma linha de webhook_events (idempotente: evento ja
 * processed/ignored e no-op). Usado pelo billing-webhook real e pelo
 * billing-dev-simulator -- mesmo caminho de codigo.
 */
export async function processWebhookEvent(
  client: SupabaseClient,
  provider: PaymentProvider,
  row: WebhookEventRow,
): Promise<void> {
  if (row.status === 'processed' || row.status === 'ignored') return

  await client.from('webhook_events').update({ status: 'processing', updated_at: new Date().toISOString() }).eq('id', row.id)

  try {
    const action = routeWebhookResourceType(row.resource_type)

    if (action === 'ignore') {
      await client.from('webhook_events').update({ status: 'ignored', processed_at: new Date().toISOString() }).eq('id', row.id)
      return
    }

    if (action === 'apply_payment' || action === 'apply_subscription_payment') {
      const payment = await provider.getPayment(row.resource_id)

      const paymentLink = await lookupPaymentLink(client, provider.name, payment.providerPaymentId, payment.externalReference)
      let organizationId = paymentLink?.organization_id ?? null
      let subscriptionRow: { id: string; organization_id: string; status: string } | null = null

      // Cartão/MP: a assinatura é achada pelo provider_subscription_id que
      // o gateway devolve. Pix: não existe esse conceito num pagamento
      // avulso -- o vínculo é payments.subscription_id, gravado no
      // checkout (fallback abaixo).
      if (payment.providerSubscriptionId) {
        subscriptionRow = await lookupSubscriptionByProviderId(client, provider.name, payment.providerSubscriptionId)
        organizationId = organizationId ?? subscriptionRow?.organization_id ?? null
      }
      if (!subscriptionRow && paymentLink?.subscription_id) {
        subscriptionRow = await lookupSubscriptionById(client, paymentLink.subscription_id)
        organizationId = organizationId ?? subscriptionRow?.organization_id ?? null
      }

      if (!organizationId) {
        throw new Error(`processWebhookEvent: não foi possível determinar a organização do pagamento ${payment.providerPaymentId}`)
      }

      const { applied } = await applyPaymentUpdate(client, {
        organizationId,
        provider: provider.name,
        providerPaymentId: payment.providerPaymentId,
        status: payment.status as PaymentStatus,
        amount: payment.amount,
        method: payment.method,
        netAmount: payment.netAmount,
        feeAmount: payment.feeAmount,
        moneyReleaseDate: payment.moneyReleaseDate?.toISOString(),
        approvedAt: payment.approvedAt?.toISOString(),
        externalReference: payment.externalReference,
        subscriptionId: subscriptionRow?.id,
        rawLastResponse: payment.raw,
      })

      // Repercute na assinatura (Peca 6 -- renovacao aprovada/recusada).
      if (applied && subscriptionRow) {
        if (payment.status === 'approved') {
          await advanceSubscriptionPeriod(client, subscriptionRow.id, 'webhook')
        } else if (payment.status === 'rejected' && subscriptionRow.status === 'active') {
          await transitionSubscription(client, subscriptionRow.id, 'past_due', 'webhook', { reason: 'renewal_rejected' })
        }
      }
    }

    if (action === 'apply_subscription') {
      const sub = await provider.getSubscription(row.resource_id)
      const subscriptionRow = await lookupSubscriptionByProviderId(client, provider.name, sub.providerSubscriptionId)
      if (!subscriptionRow) {
        throw new Error(`processWebhookEvent: assinatura ${sub.providerSubscriptionId} não encontrada localmente`)
      }

      // 'authorized'/'pending' sao informativos -- a ativacao de verdade
      // vem do evento de pagamento (subscription_authorized_payment),
      // conforme a spec. So agimos em cancelamento/pausa vindos do provider.
      if (sub.status === 'cancelled' && subscriptionRow.status !== 'canceled') {
        await transitionSubscription(client, subscriptionRow.id, 'canceled', 'webhook', { cancel_reason: 'provider_auto_cancel' })
      } else if (sub.status === 'paused' && subscriptionRow.status !== 'paused') {
        await transitionSubscription(client, subscriptionRow.id, 'paused', 'webhook', {})
      }
    }

    // Fase 5a -- contestacao ("nao fui eu", spec Peca 8). Marca o
    // pagamento charged_back, pausa a assinatura vinculada e sinaliza a
    // organizacao como risco (bloqueia novo cartao ate liberacao manual
    // -- ver create-mercadopago-subscription).
    if (action === 'apply_chargeback') {
      const cb = await provider.getChargeback(row.resource_id)
      if (!cb.providerPaymentId) {
        throw new Error(`processWebhookEvent: chargeback ${cb.providerChargebackId} sem providerPaymentId vinculado`)
      }

      const { data: paymentRow, error: paymentLookupErr } = await client
        .from('payments')
        .select('id, organization_id, subscription_id, status')
        .eq('provider', provider.name)
        .eq('provider_payment_id', cb.providerPaymentId)
        .maybeSingle()
      if (paymentLookupErr) throw new Error(`processWebhookEvent: erro ao buscar pagamento do chargeback — ${paymentLookupErr.message}`)
      if (!paymentRow) throw new Error(`processWebhookEvent: pagamento ${cb.providerPaymentId} não encontrado para o chargeback ${cb.providerChargebackId}`)

      // Idempotente por provider_chargeback_id -- evento repetido nao duplica a linha.
      const { data: existingChargeback } = await client
        .from('chargebacks')
        .select('id')
        .eq('provider_chargeback_id', cb.providerChargebackId)
        .maybeSingle()
      if (!existingChargeback) {
        await client.from('chargebacks').insert({
          organization_id: paymentRow.organization_id,
          payment_id: paymentRow.id,
          provider_chargeback_id: cb.providerChargebackId,
          status: cb.status,
          amount_cents: cb.amount,
          reason: cb.reason ?? null,
          documentation_due_at: cb.documentationDueAt?.toISOString() ?? null,
        })

        const { data: org } = await client.from('organizations').select('name').eq('id', paymentRow.organization_id).maybeSingle()
        await sendChargebackAlertEmail(org?.name ?? paymentRow.organization_id, cb.amount, cb.reason ?? null, cb.documentationDueAt?.toISOString() ?? null)
      }

      if (isForwardPaymentTransition(paymentRow.status as PaymentStatus, 'charged_back')) {
        await client.from('payments').update({ status: 'charged_back', updated_at: new Date().toISOString() }).eq('id', paymentRow.id)
      }

      await client.from('organizations').update({ risk_flagged: true }).eq('id', paymentRow.organization_id)

      if (paymentRow.subscription_id) {
        const { data: sub } = await client.from('subscriptions').select('status').eq('id', paymentRow.subscription_id).maybeSingle()
        if (sub && !['paused', 'canceled', 'expired'].includes(sub.status)) {
          await transitionSubscription(client, paymentRow.subscription_id, 'paused', 'webhook', { reason: 'chargeback' })
        }
      }
    }

    await client.from('webhook_events').update({ status: 'processed', processed_at: new Date().toISOString() }).eq('id', row.id)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await client.from('webhook_events').update({
      status: 'failed',
      attempts: row.attempts + 1,
      last_error: message,
      updated_at: new Date().toISOString(),
    }).eq('id', row.id)
    throw err
  }
}
