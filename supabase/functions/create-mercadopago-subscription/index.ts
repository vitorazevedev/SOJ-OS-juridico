import { createClient } from 'npm:@supabase/supabase-js@2'
import { getPaymentProvider } from '../_shared/billing/providers/index.ts'

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

// Modulo de Pagamentos, Fase 3 -- reescrita desta function (originalmente
// Story 1.2, chamava a API do Mercado Pago direto) pra usar a interface
// PaymentProvider e o modelo de dados completo da spec
// (billing_customers/subscriptions/payments), conforme
// docs/billing-decisions.md. A tabela/função antigas da Story 1.1
// (organization_mercadopago_subscriptions, claim_mercadopago_subscription_lock)
// ficam no banco paradas de uso, não foram apagadas.

const TERMS_VERSION = '2026-11-01'

function isValidCPF(cpf: string): boolean {
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false
  const d = cpf.split('').map(Number)
  const check = (len: number) => {
    let sum = 0
    for (let i = 0; i < len; i++) sum += d[i] * (len + 1 - i)
    const r = sum % 11
    return r < 2 ? 0 : 11 - r
  }
  return check(9) === d[9] && check(10) === d[10]
}

function isValidCNPJ(cnpj: string): boolean {
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false
  const d = cnpj.split('').map(Number)
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const check = (len: number, w: number[]) => {
    let sum = 0
    for (let i = 0; i < len; i++) sum += d[i] * w[i]
    const r = sum % 11
    return r < 2 ? 0 : 11 - r
  }
  return check(12, w1) === d[12] && check(13, w2) === d[13]
}

type Billing = {
  legal_name: string
  document_type: 'CPF' | 'CNPJ'
  document_number: string
  email: string
  address: { cep: string; logradouro: string; numero: string; complemento?: string; bairro: string; localidade: string; uf: string }
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

  let body: {
    plan_id?: string
    payment_method?: 'card' | 'pix'
    cardToken?: string
    billing?: Billing
  }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'corpo inválido' }, 400)
  }

  const planCode = body.plan_id
  const paymentMethod = body.payment_method
  const billing = body.billing

  if (!planCode) return jsonResponse({ error: 'plan_id é obrigatório' }, 400)
  if (paymentMethod !== 'card' && paymentMethod !== 'pix') return jsonResponse({ error: 'payment_method deve ser card ou pix' }, 400)
  if (paymentMethod === 'card' && !body.cardToken) return jsonResponse({ error: 'cardToken é obrigatório para pagamento com cartão' }, 400)
  if (!billing) return jsonResponse({ error: 'dados de faturamento são obrigatórios' }, 400)

  const documentDigits = (billing.document_number ?? '').replace(/\D/g, '')
  const documentValid = billing.document_type === 'CPF' ? isValidCPF(documentDigits) : isValidCNPJ(documentDigits)
  if (!documentValid) return jsonResponse({ error: `${billing.document_type} inválido` }, 400)
  if (!billing.legal_name?.trim()) return jsonResponse({ error: 'nome/razão social é obrigatório' }, 400)
  if (!/^\S+@\S+\.\S+$/.test(billing.email ?? '')) return jsonResponse({ error: 'e-mail de faturamento inválido' }, 400)

  // org_id NUNCA vem do corpo da requisição -- deriva do próprio usuário
  // autenticado (RLS já escopa isso), eliminando a possibilidade de um
  // usuário iniciar assinatura em nome de outra organização. Filtra por id
  // explicitamente -- a policy de RLS (org_id = get_org_id()) sozinha
  // devolve TODAS as linhas da organizacao do chamador, nao so a dele, e
  // quebra .maybeSingle() assim que a organizacao tem mais de 1 usuario.
  const { data: authData } = await userClient.auth.getUser()
  if (!authData.user) return jsonResponse({ error: 'Não foi possível identificar sua organização.' }, 403)

  const { data: membership, error: membershipErr } = await userClient
    .from('users')
    .select('role, org_id')
    .eq('id', authData.user.id)
    .maybeSingle()
  if (membershipErr || !membership) return jsonResponse({ error: 'Não foi possível identificar sua organização.' }, 403)
  if (membership.role !== 'admin') return jsonResponse({ error: 'Apenas administradores da organização podem iniciar uma assinatura.' }, 403)

  const orgId = membership.org_id

  const { data: plan, error: planErr } = await serviceClient
    .from('billing_plans')
    .select('id, code, price_cents, is_active')
    .eq('code', planCode)
    .maybeSingle()
  if (planErr || !plan || !plan.is_active || plan.price_cents <= 0 || plan.code === 'starter') {
    return jsonResponse({ error: `Plano inválido: ${planCode}` }, 400)
  }

  // Fase 5a -- antifraude (spec Peça 8). Sinais simples, sem bloquear a
  // organização inteira: só o pagamento com cartão é recusado, Pix segue liberado.
  const requestIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null

  const { data: org } = await serviceClient.from('organizations').select('risk_flagged').eq('id', orgId).maybeSingle()
  if (org?.risk_flagged && paymentMethod === 'card') {
    return jsonResponse({ error: 'Pagamento com cartão indisponível para esta organização no momento. Use Pix ou contate o suporte.' }, 403)
  }

  if (paymentMethod === 'card') {
    const { count: recentRejections } = await serviceClient
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('status', 'rejected')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    if ((recentRejections ?? 0) >= 3) {
      return jsonResponse({ error: 'Muitas tentativas de pagamento com cartão recusadas recentemente. Use Pix para continuar.' }, 403)
    }
  }

  await serviceClient.from('checkout_attempts').insert({ organization_id: orgId, ip: requestIp, method: paymentMethod, outcome: 'submitted' })
  if (requestIp) {
    const { count: recentAttempts } = await serviceClient
      .from('checkout_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('ip', requestIp)
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
    if ((recentAttempts ?? 0) > 10) {
      return jsonResponse({ error: 'Muitas tentativas de pagamento. Tente novamente mais tarde.' }, 429)
    }
  }

  const provider = getPaymentProvider()

  // Peça 1 da spec -- cliente no gateway (1 por organização).
  const { data: existingCustomer } = await serviceClient
    .from('billing_customers')
    .select('id, provider_customer_id')
    .eq('organization_id', orgId)
    .maybeSingle()

  let providerCustomerId = existingCustomer?.provider_customer_id ?? null
  if (!providerCustomerId) {
    const { providerCustomerId: newId } = await provider.upsertCustomer({
      userId: orgId,
      email: billing.email,
      name: billing.legal_name,
      document: documentDigits,
    })
    providerCustomerId = newId
  }

  const customerPayload = {
    organization_id: orgId,
    provider: provider.name,
    provider_customer_id: providerCustomerId,
    legal_name: billing.legal_name,
    document_type: billing.document_type,
    document_number: documentDigits,
    email: billing.email,
    address: billing.address,
  }
  if (existingCustomer) {
    await serviceClient.from('billing_customers').update(customerPayload).eq('id', existingCustomer.id)
  } else {
    await serviceClient.from('billing_customers').insert(customerPayload)
  }

  // Task herdada da Story 1.2 (Achado 1 do QA): reserva o vínculo ANTES de
  // chamar o gateway, via RPC com reclaim condicional de staleness --
  // nunca reclama uma assinatura trialing/active/past_due/paused real.
  const billingDay = Math.min(new Date().getDate(), 28)
  const { data: subscriptionId, error: lockErr } = await serviceClient.rpc('claim_subscription_lock', {
    p_organization_id: orgId,
    p_plan_id: plan.id,
    p_provider: provider.name,
    p_payment_method: paymentMethod,
    p_billing_day: billingDay,
  })
  if (lockErr) {
    console.error('Erro ao reservar assinatura:', lockErr)
    return jsonResponse({ error: 'Erro ao iniciar assinatura. Tente novamente.' }, 500)
  }
  if (!subscriptionId) {
    return jsonResponse({ error: 'Esta organização já tem uma assinatura ativa.' }, 409)
  }

  await serviceClient.from('billing_audit_log').insert({
    organization_id: orgId,
    entity: 'subscription',
    entity_id: subscriptionId,
    from_status: null,
    to_status: 'incomplete',
    actor: `user:${orgId}`,
    metadata: { plan_code: plan.code, terms_version: TERMS_VERSION, terms_accepted_at: new Date().toISOString(), ip: requestIp },
  })

  try {
    if (paymentMethod === 'card') {
      const sub = await provider.createSubscription({
        idempotencyKey: crypto.randomUUID(),
        planCode: plan.code,
        amount: plan.price_cents,
        frequency: 1,
        frequencyType: 'months',
        cardToken: body.cardToken!,
        payerEmail: billing.email,
        externalReference: subscriptionId,
      })
      await serviceClient.from('subscriptions').update({ provider_subscription_id: sub.providerSubscriptionId }).eq('id', subscriptionId)
      return jsonResponse({ success: true, subscription_id: subscriptionId, status: 'incomplete' })
    }

    // Pix -- peça 4: 1º pagamento, payments.id vira external_reference.
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000)
    const { data: paymentRow, error: paymentErr } = await serviceClient
      .from('payments')
      .insert({
        organization_id: orgId,
        provider: provider.name,
        provider_payment_id: null,
        subscription_id: subscriptionId,
        idempotency_key: crypto.randomUUID(),
        status: 'pending',
        amount_cents: plan.price_cents,
        method: 'pix',
        pix_expires_at: expiresAt.toISOString(),
      })
      .select('id')
      .single()
    if (paymentErr || !paymentRow) throw new Error(`falha ao criar pagamento Pix: ${paymentErr?.message}`)

    const pix = await provider.createPixPayment({
      idempotencyKey: crypto.randomUUID(),
      amount: plan.price_cents,
      description: `Ponderum — Plano ${plan.code}`,
      payer: { email: billing.email, name: billing.legal_name, document: documentDigits, documentType: billing.document_type },
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

    return jsonResponse({ success: true, payment_id: paymentRow.id })
  } catch (err) {
    // Não reverte a reserva: uma subscriptions 'incomplete' órfã é segura
    // (claim_subscription_lock reclama depois de 5min) -- diferente da
    // Story 1.2, aqui não há "assinatura fantasma" no gateway pra
    // desfazer quando a falha é antes da confirmação (mock sempre
    // responde; erro aqui é defensivo pra quando o MercadoPagoProvider
    // existir, Fase 6).
    console.error('Erro ao criar assinatura/pagamento no gateway:', err)
    return jsonResponse({ error: 'Não foi possível iniciar o pagamento. Tente novamente.' }, 502)
  }
})
