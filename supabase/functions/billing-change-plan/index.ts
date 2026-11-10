import { createClient } from 'npm:@supabase/supabase-js@2'
import { getPaymentProvider } from '../_shared/billing/providers/index.ts'

// Modulo de Pagamentos -- troca de plano pra quem ja e assinante (spec
// Peca 5, "v1 simples", sem proporcional): upgrade vale na hora, downgrade
// so no proximo ciclo (aplicado por advanceSubscriptionPeriod, nao aqui).
// Diferente de create-mercadopago-subscription (checkout completo), essa
// function so troca o plano de uma assinatura que ja existe -- sem pedir
// dados de faturamento de novo.

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

// Mesmo padrão de template Resend já usado em dunning/index.ts -- skip
// gracioso se RESEND_API_KEY não estiver configurado.
async function sendPlanChangedEmail(client: ReturnType<typeof createClient>, organizationId: string, planName: string, textoQuando: string): Promise<void> {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) return
  const { data: customer } = await client.from('billing_customers').select('email, legal_name').eq('organization_id', organizationId).maybeSingle()
  if (!customer?.email) return
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Ponderum <contato@ponderum.com>',
        to: [customer.email],
        template: { id: 'atualizar-assinatura', variables: { NOME: customer.legal_name ?? 'cliente', PLANO_NOVO: planName, TEXTO_QUANDO: textoQuando } },
      }),
      signal: AbortSignal.timeout(8000),
    })
  } catch (err) {
    console.error('billing-change-plan: falha ao enviar e-mail de troca de plano:', err)
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

  let body: { plan_id?: string; reason?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'corpo inválido' }, 400)
  }
  if (!body.plan_id) return jsonResponse({ error: 'plan_id é obrigatório' }, 400)

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
  if (membership.role !== 'admin') return jsonResponse({ error: 'Apenas administradores da organização podem trocar o plano.' }, 403)

  const orgId = membership.org_id

  const { data: subscription, error: subErr } = await serviceClient
    .from('subscriptions')
    .select('id, provider, provider_subscription_id, payment_method, plan_id, billing_plans!plan_id(id, code, price_cents)')
    .eq('organization_id', orgId)
    .in('status', LIVE_STATUSES)
    .maybeSingle()
  if (subErr) console.error('billing-change-plan: erro ao buscar assinatura viva:', subErr)
  if (subErr || !subscription) {
    return jsonResponse({ error: 'Nenhuma assinatura ativa encontrada. Use a tela de planos para assinar.' }, 404)
  }

  const currentPlan = subscription.billing_plans as { id: string; code: string; price_cents: number } | null
  if (!currentPlan) return jsonResponse({ error: 'Plano atual não encontrado.' }, 500)
  if (body.plan_id === currentPlan.code) return jsonResponse({ error: 'Você já está nesse plano.' }, 400)

  const { data: newPlan, error: newPlanErr } = await serviceClient
    .from('billing_plans')
    .select('id, code, name, price_cents, is_active')
    .eq('code', body.plan_id)
    .maybeSingle()
  if (newPlanErr || !newPlan || !newPlan.is_active || newPlan.price_cents <= 0 || newPlan.code === 'starter') {
    return jsonResponse({ error: `Plano inválido: ${body.plan_id}` }, 400)
  }

  const isUpgrade = newPlan.price_cents > currentPlan.price_cents

  if (isUpgrade) {
    if (subscription.payment_method === 'card' && subscription.provider_subscription_id) {
      try {
        const provider = getPaymentProvider()
        await provider.updateSubscriptionAmount({
          providerSubscriptionId: subscription.provider_subscription_id,
          amount: newPlan.price_cents,
        })
      } catch (err) {
        // Best-effort: no mock isso nunca falha; defensivo pra quando o
        // MercadoPagoProvider real existir (Fase 6) -- não bloqueia a
        // troca por uma falha de sincronização com o gateway.
        console.error('billing-change-plan: falha ao atualizar valor no gateway (não bloqueante):', err)
      }
    }

    const { error: updateErr } = await serviceClient
      .from('subscriptions')
      .update({ plan_id: newPlan.id, pending_plan_id: null, updated_at: new Date().toISOString() })
      .eq('id', subscription.id)
    if (updateErr) return jsonResponse({ error: 'Erro ao atualizar o plano. Tente novamente.' }, 500)

    await serviceClient.from('billing_audit_log').insert({
      organization_id: orgId,
      entity: 'subscription',
      entity_id: subscription.id,
      from_status: null,
      to_status: null,
      actor: `user:${orgId}`,
      metadata: { change: 'upgrade', from_plan_id: currentPlan.id, to_plan_id: newPlan.id },
    })

    await sendPlanChangedEmail(serviceClient, orgId, newPlan.name, 'A mudança já está valendo, sem precisar esperar o próximo ciclo.')

    return jsonResponse({ success: true, applied_immediately: true })
  }

  // Downgrade -- so agenda; quem aplica de verdade e advanceSubscriptionPeriod
  // na proxima renovacao aprovada (_shared/billing/domain/webhooks.ts).
  const { error: updateErr } = await serviceClient
    .from('subscriptions')
    .update({ pending_plan_id: newPlan.id, updated_at: new Date().toISOString() })
    .eq('id', subscription.id)
  if (updateErr) return jsonResponse({ error: 'Erro ao agendar a troca de plano. Tente novamente.' }, 500)

  const { data: subAfter } = await serviceClient
    .from('subscriptions')
    .select('current_period_end')
    .eq('id', subscription.id)
    .maybeSingle()

  await serviceClient.from('billing_audit_log').insert({
    organization_id: orgId,
    entity: 'subscription',
    entity_id: subscription.id,
    from_status: null,
    to_status: null,
    actor: `user:${orgId}`,
    metadata: { change: 'downgrade_scheduled', from_plan_id: currentPlan.id, to_plan_id: newPlan.id, reason: body.reason ?? null },
  })

  const effectiveAt = subAfter?.current_period_end ?? null
  await sendPlanChangedEmail(
    serviceClient,
    orgId,
    newPlan.name,
    effectiveAt ? `A mudança passa a valer a partir de ${new Date(effectiveAt).toLocaleDateString('pt-BR')}, quando o período atual terminar.` : 'A mudança passa a valer no próximo ciclo de cobrança.'
  )

  return jsonResponse({ success: true, applied_immediately: false, effective_at: subAfter?.current_period_end ?? null })
})
