import { createClient } from 'npm:@supabase/supabase-js@2'
import { getPaymentProvider } from '../_shared/billing/providers/index.ts'
import { isForwardPaymentTransition, type PaymentStatus } from '../_shared/billing/domain/payments.ts'
import { transitionSubscription } from '../_shared/billing/domain/subscriptions.ts'

// Modulo de Pagamentos, Fase 4a -- cancelamento self-service (spec Peca 7)
// e reativacao. Cancelar NAO fecha a assinatura na hora (cancel_at_period_end
// = true, acesso mantido ate o fim do periodo) -- quem fecha de verdade e o
// job close-canceled, na proxima renovacao que nao vem. Excecao: arrependimento
// de 7 dias (CDC art. 49) para pessoa fisica na primeira contratacao, que
// cancela e estorna na hora.

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

const LIVE_STATUSES = ['incomplete', 'trialing', 'active', 'past_due', 'paused']
const REGRET_PERIOD_MS = 7 * 24 * 60 * 60 * 1000

// Mesmo padrao de envio ja usado em dunning/index.ts e domain/invoices.ts:
// tenta via RESEND_API_KEY, pula silenciosamente se o secret nao estiver
// configurado -- nunca bloqueia o cancelamento em si.
function cancellationProtocol(subscriptionId: string): string {
  return `CANC-${subscriptionId.slice(0, 8).toUpperCase()}`
}

async function sendCancellationEmail(to: string, nome: string, protocol: string, refunded: boolean, accessUntil: string | null): Promise<void> {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) return
  const textoResultado = refunded
    ? 'O valor pago foi estornado integralmente, conforme o direito de arrependimento (art. 49 do CDC).'
    : `Você continua com acesso normal até ${accessUntil ? new Date(accessUntil).toLocaleDateString('pt-BR') : 'o fim do período já pago'}.`
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Ponderum <contato@ponderum.com>',
        to: [to],
        template: { id: 'confirmao-de-cancelamento', variables: { NOME: nome, TEXTO_RESULTADO: textoResultado, PROTOCOLO: protocol } },
      }),
      signal: AbortSignal.timeout(8000),
    })
  } catch (err) {
    console.error('billing-cancel-subscription: falha ao enviar e-mail de confirmação:', err)
  }
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

  let body: { action?: 'cancel' | 'reactivate'; reason_category?: string; reason_text?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'corpo inválido' }, 400)
  }

  const { data: authData } = await userClient.auth.getUser()
  if (!authData.user) return jsonResponse({ error: 'Não foi possível identificar sua organização.' }, 403)

  // Filtra por id explicitamente -- a policy de RLS (org_id = get_org_id())
  // sozinha devolve TODAS as linhas da organizacao do chamador, nao so a
  // dele, e quebra .maybeSingle() assim que a organizacao tem mais de 1
  // usuario.
  const { data: membership, error: membershipErr } = await userClient
    .from('users')
    .select('role, org_id')
    .eq('id', authData.user.id)
    .maybeSingle()
  if (membershipErr || !membership) return jsonResponse({ error: 'Não foi possível identificar sua organização.' }, 403)
  if (membership.role !== 'admin') return jsonResponse({ error: 'Apenas administradores da organização podem gerenciar a assinatura.' }, 403)

  const orgId = membership.org_id

  if (body.action === 'reactivate') {
    const { data: sub, error: subErr } = await serviceClient
      .from('subscriptions')
      .select('id')
      .eq('organization_id', orgId)
      .eq('status', 'active')
      .eq('cancel_at_period_end', true)
      .maybeSingle()
    if (subErr) console.error('billing-cancel-subscription: erro ao buscar assinatura pra reativar:', subErr)
    if (subErr || !sub) return jsonResponse({ error: 'Nenhum cancelamento agendado encontrado.' }, 404)

    const { error: updateErr } = await serviceClient
      .from('subscriptions')
      .update({ cancel_at_period_end: false, canceled_at: null, cancel_reason: null, updated_at: new Date().toISOString() })
      .eq('id', sub.id)
    if (updateErr) return jsonResponse({ error: 'Erro ao reativar. Tente novamente.' }, 500)

    await serviceClient.from('billing_audit_log').insert({
      organization_id: orgId,
      entity: 'subscription',
      entity_id: sub.id,
      from_status: null,
      to_status: null,
      actor: `user:${orgId}`,
      metadata: { change: 'reactivated' },
    })

    return jsonResponse({ success: true })
  }

  if (body.action !== 'cancel') return jsonResponse({ error: 'action deve ser cancel ou reactivate' }, 400)
  if (!body.reason_category) return jsonResponse({ error: 'reason_category é obrigatório' }, 400)

  const { data: subscription, error: subErr } = await serviceClient
    .from('subscriptions')
    .select('id, created_at, current_period_end, cancel_at_period_end, provider, provider_subscription_id')
    .eq('organization_id', orgId)
    .in('status', LIVE_STATUSES)
    .maybeSingle()
  if (subErr) console.error('billing-cancel-subscription: erro ao buscar assinatura viva:', subErr)
  if (subErr || !subscription) return jsonResponse({ error: 'Nenhuma assinatura ativa encontrada.' }, 404)
  if (subscription.cancel_at_period_end) return jsonResponse({ error: 'O cancelamento já está agendado.' }, 400)

  const provider = getPaymentProvider()

  // Arrependimento (CDC art. 49): PF, primeira e única assinatura que a
  // organização já teve, dentro de 7 dias da contratação.
  const { data: customer } = await serviceClient
    .from('billing_customers')
    .select('document_type, email, legal_name')
    .eq('organization_id', orgId)
    .maybeSingle()
  const { count: subscriptionCount } = await serviceClient
    .from('subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)

  const withinRegretPeriod = Date.now() - new Date(subscription.created_at).getTime() <= REGRET_PERIOD_MS
  const isFirstEverSubscription = (subscriptionCount ?? 0) <= 1
  const isRegret = customer?.document_type === 'CPF' && isFirstEverSubscription && withinRegretPeriod

  if (isRegret) {
    const { data: lastPayment } = await serviceClient
      .from('payments')
      .select('id, provider_payment_id, status, amount_cents')
      .eq('subscription_id', subscription.id)
      .eq('status', 'approved')
      .order('approved_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lastPayment) {
      try {
        await provider.refundPayment({ idempotencyKey: crypto.randomUUID(), providerPaymentId: lastPayment.provider_payment_id })
      } catch (err) {
        console.error('billing-cancel-subscription: falha ao estornar no gateway:', err)
      }
      if (isForwardPaymentTransition(lastPayment.status as PaymentStatus, 'refunded')) {
        await serviceClient.from('payments').update({ status: 'refunded', updated_at: new Date().toISOString() }).eq('id', lastPayment.id)
      }
    }

    if (subscription.provider_subscription_id) {
      try {
        await provider.cancelSubscription(subscription.provider_subscription_id)
      } catch (err) {
        console.error('billing-cancel-subscription: falha ao cancelar no gateway (não bloqueante):', err)
      }
    }

    await serviceClient
      .from('subscriptions')
      .update({ canceled_at: new Date().toISOString(), cancel_reason: body.reason_category })
      .eq('id', subscription.id)
    await transitionSubscription(serviceClient, subscription.id, 'canceled', `user:${orgId}`, { reason: 'regret_period', reason_text: body.reason_text ?? null })

    // Cupom (docs/CUPOM_SPEC.md, secao 5): "estorno pelo direito de
    // arrependimento -- o uso do cupom volta a ser contado como nao
    // utilizado no limite total". Apaga a linha (nao so marca canceled)
    // pra nao contar em max_redemptions/max_per_organization nunca mais.
    await serviceClient.from('coupon_redemptions').delete().eq('subscription_id', subscription.id).eq('status', 'active')

    const protocol = cancellationProtocol(subscription.id)
    if (customer?.email) await sendCancellationEmail(customer.email, customer.legal_name ?? 'cliente', protocol, true, null)

    return jsonResponse({ success: true, refunded: true, protocol })
  }

  if (subscription.provider_subscription_id) {
    try {
      await provider.cancelSubscription(subscription.provider_subscription_id)
    } catch (err) {
      console.error('billing-cancel-subscription: falha ao cancelar no gateway (não bloqueante):', err)
    }
  }

  const { error: updateErr } = await serviceClient
    .from('subscriptions')
    .update({
      cancel_at_period_end: true,
      canceled_at: new Date().toISOString(),
      cancel_reason: body.reason_category,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscription.id)
  if (updateErr) return jsonResponse({ error: 'Erro ao cancelar. Tente novamente.' }, 500)

  // Cupom (docs/CUPOM_SPEC.md, secao 5): "cancelou -- resgate vira canceled"
  // (cancelamento agendado continua contando no limite de usos -- so o
  // arrependimento acima libera o uso).
  await serviceClient
    .from('coupon_redemptions')
    .update({ status: 'canceled', completed_at: new Date().toISOString() })
    .eq('subscription_id', subscription.id)
    .eq('status', 'active')

  await serviceClient.from('billing_audit_log').insert({
    organization_id: orgId,
    entity: 'subscription',
    entity_id: subscription.id,
    from_status: null,
    to_status: null,
    actor: `user:${orgId}`,
    metadata: { change: 'cancel_scheduled', reason_category: body.reason_category, reason_text: body.reason_text ?? null },
  })

  const protocol = cancellationProtocol(subscription.id)
  if (customer?.email) await sendCancellationEmail(customer.email, customer.legal_name ?? 'cliente', protocol, false, subscription.current_period_end)

  return jsonResponse({ success: true, refunded: false, access_until: subscription.current_period_end, protocol })
})
