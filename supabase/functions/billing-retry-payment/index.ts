import { createClient } from 'npm:@supabase/supabase-js@2'
import { getPaymentProvider } from '../_shared/billing/providers/index.ts'

// Modulo de Pagamentos, Fase 4b -- sair do past_due (spec Peca 6):
// atualizar cartao (dispara nova tentativa no gateway real; em mock, a
// aprovacao/recusa da nova tentativa e simulada depois via
// billing-dev-simulator, igual a toda ativacao ate aqui) ou pagar a
// fatura atual com Pix na hora (mesmo padrao Pix do checkout).

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

  let body: { method?: 'card' | 'pix'; cardToken?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'corpo inválido' }, 400)
  }
  if (body.method !== 'card' && body.method !== 'pix') return jsonResponse({ error: 'method deve ser card ou pix' }, 400)
  if (body.method === 'card' && !body.cardToken) return jsonResponse({ error: 'cardToken é obrigatório' }, 400)

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

  const { data: subscription, error: subErr } = await serviceClient
    .from('subscriptions')
    .select('id, provider, provider_subscription_id, plan_id, billing_plans!plan_id(price_cents, code)')
    .eq('organization_id', orgId)
    .eq('status', 'past_due')
    .maybeSingle()
  if (subErr) console.error('billing-retry-payment: erro ao buscar assinatura past_due:', subErr)
  if (subErr || !subscription) return jsonResponse({ error: 'Nenhuma cobrança pendente encontrada para esta organização.' }, 404)

  const provider = getPaymentProvider()
  const plan = subscription.billing_plans as { price_cents: number; code: string } | null

  if (body.method === 'card') {
    if (subscription.provider_subscription_id) {
      try {
        await provider.updateSubscriptionCard({ providerSubscriptionId: subscription.provider_subscription_id, cardToken: body.cardToken! })
      } catch (err) {
        console.error('billing-retry-payment: falha ao atualizar cartão no gateway (não bloqueante):', err)
      }
    }

    await serviceClient.from('billing_audit_log').insert({
      organization_id: orgId,
      entity: 'subscription',
      entity_id: subscription.id,
      from_status: null,
      to_status: null,
      actor: `user:${orgId}`,
      metadata: { change: 'card_updated' },
    })

    return jsonResponse({ success: true, method: 'card' })
  }

  // Pix -- mesmo padrao do checkout (payments.id vira external_reference).
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000)
  const { data: paymentRow, error: paymentErr } = await serviceClient
    .from('payments')
    .insert({
      organization_id: orgId,
      provider: provider.name,
      provider_payment_id: null,
      subscription_id: subscription.id,
      idempotency_key: crypto.randomUUID(),
      status: 'pending',
      amount_cents: plan?.price_cents ?? 0,
      method: 'pix',
      pix_expires_at: expiresAt.toISOString(),
    })
    .select('id')
    .single()
  if (paymentErr || !paymentRow) return jsonResponse({ error: 'Erro ao gerar o Pix. Tente novamente.' }, 500)

  try {
    const { data: customer } = await serviceClient
      .from('billing_customers')
      .select('legal_name, email, document_type, document_number')
      .eq('organization_id', orgId)
      .maybeSingle()

    const pix = await provider.createPixPayment({
      idempotencyKey: crypto.randomUUID(),
      amount: plan?.price_cents ?? 0,
      description: `Ponderum — Plano ${plan?.code ?? ''} (retentativa)`,
      payer: {
        email: customer?.email ?? '',
        name: customer?.legal_name ?? '',
        document: customer?.document_number ?? '',
        documentType: (customer?.document_type as 'CPF' | 'CNPJ') ?? 'CPF',
      },
      expiresAt,
      externalReference: paymentRow.id,
    })
    await serviceClient
      .from('payments')
      .update({ provider_payment_id: pix.providerPaymentId, pix_qr_code: pix.pix.qrCode, pix_qr_code_base64: pix.pix.qrCodeBase64 })
      .eq('id', paymentRow.id)
  } catch (err) {
    console.error('billing-retry-payment: falha ao gerar Pix no gateway:', err)
    return jsonResponse({ error: 'Não foi possível gerar o Pix. Tente novamente.' }, 502)
  }

  return jsonResponse({ success: true, method: 'pix', payment_id: paymentRow.id })
})
