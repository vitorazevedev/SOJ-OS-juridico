import { createClient } from 'npm:@supabase/supabase-js@2'
import { validateCoupon } from '../_shared/billing/domain/coupons.ts'

// Modulo de Cupom de Desconto (docs/CUPOM_SPEC.md) -- previa do desconto no
// checkout (secao 6). NAO reserva o cupom (so quem chama
// create-mercadopago-subscription reserva de verdade, via redeem_coupon).
// Rate limit: 10 tentativas por usuario a cada 10min, contra adivinhacao de
// codigo (secao 6) -- registrado em coupon_validation_attempts.

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

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT_MAX_ATTEMPTS = 10

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

  let body: { code?: string; planCode?: string; method?: 'card' | 'pix' }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'corpo inválido' }, 400)
  }
  if (!body.code) return jsonResponse({ error: 'cupom inválido' }, 400)
  if (!body.planCode) return jsonResponse({ error: 'plan_id é obrigatório' }, 400)
  if (body.method !== 'card' && body.method !== 'pix') return jsonResponse({ error: 'method deve ser card ou pix' }, 400)

  const { data: authData } = await userClient.auth.getUser()
  if (!authData.user) return jsonResponse({ error: 'Não foi possível identificar sua organização.' }, 403)

  const { data: membership } = await userClient
    .from('users')
    .select('org_id')
    .eq('id', authData.user.id)
    .maybeSingle()
  if (!membership) return jsonResponse({ error: 'Não foi possível identificar sua organização.' }, 403)

  await serviceClient.from('coupon_validation_attempts').insert({ user_id: authData.user.id })
  const { count: recentAttempts } = await serviceClient
    .from('coupon_validation_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', authData.user.id)
    .gte('created_at', new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString())
  if ((recentAttempts ?? 0) > RATE_LIMIT_MAX_ATTEMPTS) {
    return jsonResponse({ error: 'Muitas tentativas. Tente novamente mais tarde.' }, 429)
  }

  const { data: plan } = await serviceClient
    .from('billing_plans')
    .select('code, price_cents, is_active')
    .eq('code', body.planCode)
    .maybeSingle()
  if (!plan || !plan.is_active || plan.price_cents <= 0) {
    return jsonResponse({ error: `Plano inválido: ${body.planCode}` }, 400)
  }

  try {
    const result = await validateCoupon(serviceClient, {
      code: body.code,
      planCode: plan.code,
      method: body.method,
      organizationId: membership.org_id,
      fullAmountCents: plan.price_cents,
    })
    if (!result.valid) return jsonResponse({ valid: false, reason: result.reason })
    return jsonResponse({
      valid: true,
      code: result.coupon.code,
      fullAmountCents: result.fullAmountCents,
      discountedAmountCents: result.discountedAmountCents,
      ruleText: result.ruleText,
    })
  } catch (err) {
    console.error('billing-validate-coupon: erro ao validar cupom:', err)
    return jsonResponse({ error: 'Erro ao validar cupom. Tente novamente.' }, 500)
  }
})
