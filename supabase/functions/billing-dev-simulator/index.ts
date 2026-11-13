import { createClient } from 'npm:@supabase/supabase-js@2'
import { getPaymentProvider } from '../_shared/billing/providers/index.ts'
import { recordWebhookEvent, processWebhookEvent } from '../_shared/billing/domain/webhooks.ts'
import type { MockProvider } from '../_shared/billing/providers/mock.ts'
import { MockInvoiceProvider } from '../_shared/billing/invoiceProviders/mock.ts'
import { issueFiscalInvoice } from '../_shared/billing/domain/invoices.ts'

// Modulo de Pagamentos, Fase 2 -- simulador de eventos do gateway (spec
// secao 11), SO contra o MockProvider. Em vez de manipular payments/
// subscriptions direto, monta um corpo de webhook e chama as MESMAS
// recordWebhookEvent/processWebhookEvent que o billing-webhook real usa --
// testa o processador de verdade, nao um caminho paralelo.
//
// LIMITACAO CONHECIDA: 'subscription_outcome' e 'payment_outcome' com
// subscriptionId exigem uma assinatura com provider='mock'. As 4
// organizacoes reais hoje tem assinatura 'manual' (ativa/trial, herdada da
// Fase 1) -- o indice one_live_subscription_per_org nao deixa criar uma
// segunda assinatura 'mock' viva na mesma organizacao. Essas duas acoes so
// funcionam numa organizacao de teste sem assinatura viva ainda; o
// 'payment_outcome' sem subscriptionId (pagamento avulso) funciona em
// qualquer organizacao real.

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

function mintId(prefix: string): string {
  return `mock_${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return jsonResponse({ error: 'Unauthorized' }, 401)

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )
  const serviceClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: authData } = await userClient.auth.getUser()
  if (!authData.user) return jsonResponse({ error: 'Acesso restrito à equipe Ponderum (Menu Dev).' }, 403)

  // has_staff_role('dev') em vez das antigas colunas is_ponderum_staff/
  // can_view_dev (staff_members.roles é a fonte de verdade desde a Etapa A
  // da Fase 1 do Manager).
  const { data: callerIsDev, error: meErr } = await userClient.rpc('has_staff_role', { p_role: 'dev' })
  if (meErr || !callerIsDev) {
    return jsonResponse({ error: 'Acesso restrito à equipe Ponderum (Menu Dev).' }, 403)
  }

  const provider = getPaymentProvider()
  if (provider.name !== 'mock') {
    return jsonResponse({ error: `Simulador desativado: PAYMENT_PROVIDER=${provider.name}. Só funciona com 'mock'.` }, 409)
  }
  const mock = provider as MockProvider

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'corpo inválido' }, 400)
  }

  const action = body.action
  const headers = new Headers()
  const query = new URLSearchParams()

  try {
    if (action === 'resend') {
      const webhookEventId = String(body.webhookEventId ?? '')
      const { data: row, error } = await serviceClient.from('webhook_events').select().eq('id', webhookEventId).single()
      if (error || !row) return jsonResponse({ error: 'webhook_event não encontrado' }, 404)

      await processWebhookEvent(serviceClient, provider, row)
      const { data: after } = await serviceClient.from('webhook_events').select().eq('id', webhookEventId).single()
      return jsonResponse({ webhook_event: after })
    }

    if (action === 'payment_outcome') {
      const status = String(body.status ?? 'approved') as 'approved' | 'rejected' | 'in_process' | 'pending'
      const amountCents = Number(body.amountCents ?? 19900)
      const method = (body.method === 'pix' ? 'pix' : 'card') as 'card' | 'pix'
      const subscriptionId = body.subscriptionId ? String(body.subscriptionId) : undefined

      let organizationId = body.organizationId ? String(body.organizationId) : undefined
      let providerSubscriptionId: string | undefined

      if (subscriptionId) {
        const { data: sub, error } = await serviceClient
          .from('subscriptions')
          .select('organization_id, provider, provider_subscription_id')
          .eq('id', subscriptionId)
          .single()
        if (error || !sub) return jsonResponse({ error: 'assinatura não encontrada' }, 404)
        if (sub.provider !== 'mock') {
          return jsonResponse({ error: `assinatura ${subscriptionId} não é provider='mock' (é '${sub.provider}') -- simulador não opera em assinaturas reais/manuais` }, 409)
        }
        organizationId = sub.organization_id
        providerSubscriptionId = sub.provider_subscription_id ?? mintId('sub')
        if (!sub.provider_subscription_id) {
          await serviceClient.from('subscriptions').update({ provider_subscription_id: providerSubscriptionId }).eq('id', subscriptionId)
        }
      }

      let providerPaymentId = body.providerPaymentId ? String(body.providerPaymentId) : undefined
      let externalReference: string | undefined

      if (providerPaymentId) {
        // Reenvio / fora de ordem sobre um pagamento mock já existente --
        // reusa a organização já vinculada, não cria linha nova.
        const { data: existingPayment, error } = await serviceClient
          .from('payments')
          .select('organization_id')
          .eq('provider', 'mock')
          .eq('provider_payment_id', providerPaymentId)
          .maybeSingle()
        if (error || !existingPayment) {
          return jsonResponse({ error: `pagamento mock ${providerPaymentId} não encontrado -- omita providerPaymentId para criar um novo` }, 404)
        }
        organizationId = existingPayment.organization_id
      } else {
        if (!organizationId) return jsonResponse({ error: 'organizationId é obrigatório (direto, ou via subscriptionId)' }, 400)

        // Pagamento novo: cria a linha 'pending' ANTES do webhook, exatamente
        // como o checkout fará na Fase 3 (payments.id vira external_reference
        // enviado ao gateway) -- é assim que applyPaymentUpdate acha a
        // organização no primeiro contato do gateway com este pagamento.
        providerPaymentId = mintId('pay')
        const { data: created, error: prelimErr } = await serviceClient
          .from('payments')
          .insert({
            organization_id: organizationId,
            provider: 'mock',
            provider_payment_id: null,
            subscription_id: subscriptionId ?? null,
            idempotency_key: crypto.randomUUID(),
            status: 'pending',
            amount_cents: amountCents,
            method,
          })
          .select('id')
          .single()
        if (prelimErr || !created) return jsonResponse({ error: `falha ao criar pagamento preliminar: ${prelimErr?.message}` }, 500)
        externalReference = created.id
      }

      const now = new Date()
      mock.simulatePayment(providerPaymentId, {
        status,
        amount: amountCents,
        method,
        providerSubscriptionId,
        externalReference,
        netAmount: status === 'approved' ? Math.round(amountCents * 0.9502) : undefined,
        feeAmount: status === 'approved' ? Math.round(amountCents * 0.0498) : undefined,
        moneyReleaseDate: status === 'approved' ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) : undefined,
        approvedAt: status === 'approved' ? now : undefined,
      })

      const webhookBody = {
        id: body.eventId ?? crypto.randomUUID(),
        type: subscriptionId ? 'subscription_authorized_payment' : 'payment',
        action: 'payment.updated',
        data: { id: providerPaymentId },
      }
      const event = mock.parseWebhook({ headers, query, body: webhookBody })
      const { row, isNew } = await recordWebhookEvent(serviceClient, mock.name, event, webhookBody, true)
      if (isNew) await processWebhookEvent(serviceClient, provider, row)

      const { data: webhookEventAfter } = await serviceClient.from('webhook_events').select().eq('id', row.id).single()
      const { data: payment } = await serviceClient.from('payments').select().eq('provider', 'mock').eq('provider_payment_id', providerPaymentId).maybeSingle()
      return jsonResponse({ webhook_event: webhookEventAfter ?? row, duplicate: !isNew, payment })
    }

    if (action === 'subscription_outcome') {
      const subscriptionId = String(body.subscriptionId ?? '')
      const status = String(body.status ?? 'cancelled') as 'cancelled' | 'paused'

      const { data: sub, error } = await serviceClient
        .from('subscriptions')
        .select('organization_id, provider, provider_subscription_id')
        .eq('id', subscriptionId)
        .single()
      if (error || !sub) return jsonResponse({ error: 'assinatura não encontrada' }, 404)
      if (sub.provider !== 'mock') {
        return jsonResponse({ error: `assinatura ${subscriptionId} não é provider='mock' (é '${sub.provider}') -- simulador não opera em assinaturas reais/manuais` }, 409)
      }

      const providerSubscriptionId = sub.provider_subscription_id ?? mintId('sub')
      if (!sub.provider_subscription_id) {
        await serviceClient.from('subscriptions').update({ provider_subscription_id: providerSubscriptionId }).eq('id', subscriptionId)
      }

      mock.simulateSubscription(providerSubscriptionId, { status })

      const webhookBody = {
        id: body.eventId ?? crypto.randomUUID(),
        type: 'subscription_preapproval',
        action: 'subscription_preapproval.updated',
        data: { id: providerSubscriptionId },
      }
      const event = mock.parseWebhook({ headers, query, body: webhookBody })
      const { row, isNew } = await recordWebhookEvent(serviceClient, mock.name, event, webhookBody, true)
      if (isNew) await processWebhookEvent(serviceClient, provider, row)

      const { data: webhookEventAfter } = await serviceClient.from('webhook_events').select().eq('id', row.id).single()
      const { data: after } = await serviceClient.from('subscriptions').select().eq('id', subscriptionId).single()
      return jsonResponse({ webhook_event: webhookEventAfter ?? row, duplicate: !isNew, subscription: after })
    }

    if (action === 'chargeback') {
      const providerPaymentId = String(body.providerPaymentId ?? '')
      const amountCents = body.amountCents != null ? Number(body.amountCents) : undefined

      const { data: payment, error: paymentErr } = await serviceClient
        .from('payments')
        .select('amount_cents')
        .eq('provider', 'mock')
        .eq('provider_payment_id', providerPaymentId)
        .maybeSingle()
      if (paymentErr || !payment) return jsonResponse({ error: `pagamento mock ${providerPaymentId} não encontrado` }, 404)

      const chargebackId = mintId('cb')
      mock.simulateChargeback(chargebackId, {
        status: 'opened',
        amount: amountCents ?? payment.amount_cents,
        reason: typeof body.reason === 'string' ? body.reason : undefined,
        providerPaymentId,
      })

      const webhookBody = {
        id: body.eventId ?? crypto.randomUUID(),
        type: 'chargeback',
        action: 'chargeback.created',
        data: { id: chargebackId },
      }
      const event = mock.parseWebhook({ headers, query, body: webhookBody })
      const { row, isNew } = await recordWebhookEvent(serviceClient, mock.name, event, webhookBody, true)
      if (isNew) await processWebhookEvent(serviceClient, provider, row)

      const { data: webhookEventAfter } = await serviceClient.from('webhook_events').select().eq('id', row.id).single()
      const { data: chargebackRow } = await serviceClient.from('chargebacks').select().eq('provider_chargeback_id', chargebackId).maybeSingle()
      return jsonResponse({ webhook_event: webhookEventAfter ?? row, duplicate: !isNew, chargeback: chargebackRow })
    }

    if (action === 'issue_invoice') {
      const paymentId = String(body.paymentId ?? '')
      const { data: fi, error: fiErr } = await serviceClient
        .from('fiscal_invoices')
        .select('id, organization_id, payment_id, attempts, status')
        .eq('payment_id', paymentId)
        .maybeSingle()
      if (fiErr || !fi) return jsonResponse({ error: `fiscal_invoice não encontrada para o pagamento ${paymentId} (o pagamento precisa estar approved)` }, 404)

      const invoiceProvider = new MockInvoiceProvider()
      const resendKey = Deno.env.get('RESEND_API_KEY')
      const success = await issueFiscalInvoice(serviceClient, invoiceProvider, resendKey, fi)

      const { data: after } = await serviceClient.from('fiscal_invoices').select().eq('id', fi.id).single()
      return jsonResponse({ success, fiscal_invoice: after })
    }

    return jsonResponse({ error: `ação desconhecida: ${action}. Use payment_outcome, subscription_outcome, chargeback, issue_invoice ou resend.` }, 400)
  } catch (err) {
    console.error('billing-dev-simulator: erro', err)
    return jsonResponse({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
