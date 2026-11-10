import { createClient } from 'npm:@supabase/supabase-js@2'
import { transitionSubscription } from '../_shared/billing/domain/subscriptions.ts'

// Modulo de Pagamentos, Fase 4b -- job diario de dunning (spec Peca 6,
// secao 9: "diario 09:00"). E-mails D0/D+3/D+6 (aviso), D+7 (acesso
// suspenso) + fecha o ciclo: past_due -> paused no fim da carencia,
// paused -> expired depois de 30 dias (reaproveita grace_period_ends_at
// pra contar os dois prazos, em vez de coluna nova).
//
// Envio de e-mail segue o MESMO padrao ja usado no projeto (ex.:
// send-obligation-alerts/index.ts): tenta via RESEND_API_KEY, pula
// silenciosamente se o secret nao estiver configurado.

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

const PAUSE_PERIOD_MS = 30 * 24 * 60 * 60 * 1000
const DEDUPE_WINDOW_MS = 20 * 60 * 60 * 1000 // ~20h -- evita reenvio se o job rodar 2x no mesmo dia

function fmtBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// Mesmo template "payment-failed" do Resend usado por toda recusa de
// cobrança (D0/D+3/D+6/D+7 e a transicao pra paused) -- o texto do
// template ja cobre "sua conta pode ter o acesso limitado", que continua
// verdadeiro mesmo apos pausar (vira equivalente ao Freemium, nao bloqueio
// total). Sem variacao de copy por dia -- mesma logica de admin-send-invoice-email.
async function sendPaymentFailedEmail(to: string, nome: string, valorCents: number, resendKey: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Ponderum <contato@ponderum.com>',
        to: [to],
        template: { id: 'payment-failed', variables: { NOME: nome, VALOR: fmtBRL(valorCents) } },
      }),
      signal: AbortSignal.timeout(8000),
    })
    return res.ok
  } catch (err) {
    console.error('dunning: falha ao enviar e-mail:', err)
    return false
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const cronSecret = Deno.env.get('CRON_SECRET')
  if (req.headers.get('x-cron-secret') !== cronSecret) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const resendKey = Deno.env.get('RESEND_API_KEY')

  const serviceClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  let emailsSent = 0
  let paused = 0
  let expired = 0

  const { data: pastDue, error: pastDueErr } = await serviceClient
    .from('subscriptions')
    .select('id, organization_id, past_due_since, grace_period_ends_at, billing_plans!plan_id(price_cents)')
    .eq('status', 'past_due')

  if (pastDueErr) {
    console.error('dunning: falha ao buscar assinaturas past_due:', pastDueErr)
  }

  for (const sub of pastDue ?? []) {
    const plan = sub.billing_plans as { price_cents: number } | null
    const daysSince = sub.past_due_since
      ? Math.floor((Date.now() - new Date(sub.past_due_since).getTime()) / (24 * 60 * 60 * 1000))
      : null
    const isGraceOver = sub.grace_period_ends_at ? Date.now() > new Date(sub.grace_period_ends_at).getTime() : false

    if (isGraceOver) {
      const { data: customer } = await serviceClient.from('billing_customers').select('email, legal_name').eq('organization_id', sub.organization_id).maybeSingle()
      if (resendKey && customer?.email && plan) {
        if (await sendPaymentFailedEmail(customer.email, customer.legal_name ?? 'cliente', plan.price_cents, resendKey)) emailsSent++
      }
      try {
        await transitionSubscription(serviceClient, sub.id, 'paused', 'job:dunning', { reason: 'grace_period_ended' })
        await serviceClient
          .from('subscriptions')
          .update({ grace_period_ends_at: new Date(Date.now() + PAUSE_PERIOD_MS).toISOString() })
          .eq('id', sub.id)
        paused++
      } catch (err) {
        console.error(`dunning: falha ao pausar assinatura ${sub.id}:`, err)
      }
      continue
    }

    if (daysSince === 0 || daysSince === 3 || daysSince === 6) {
      const { data: already } = await serviceClient
        .from('billing_audit_log')
        .select('id')
        .eq('entity_id', sub.id)
        .eq('entity', 'subscription')
        .gte('created_at', new Date(Date.now() - DEDUPE_WINDOW_MS).toISOString())
        .contains('metadata', { change: 'dunning_check', day: daysSince })
        .maybeSingle()

      if (!already) {
        const { data: customer } = await serviceClient.from('billing_customers').select('email, legal_name').eq('organization_id', sub.organization_id).maybeSingle()
        let emailSent = false
        if (resendKey && customer?.email && plan) {
          emailSent = await sendPaymentFailedEmail(customer.email, customer.legal_name ?? 'cliente', plan.price_cents, resendKey)
          if (emailSent) emailsSent++
        }
        await serviceClient.from('billing_audit_log').insert({
          organization_id: sub.organization_id,
          entity: 'subscription',
          entity_id: sub.id,
          from_status: null,
          to_status: null,
          actor: 'job:dunning',
          metadata: { change: 'dunning_check', day: daysSince, email_sent: emailSent },
        })
      }
    }
  }

  const { data: pausedSubs, error: pausedErr } = await serviceClient
    .from('subscriptions')
    .select('id')
    .eq('status', 'paused')
    .lt('grace_period_ends_at', new Date().toISOString())

  if (pausedErr) console.error('dunning: falha ao buscar assinaturas paused:', pausedErr)

  for (const sub of pausedSubs ?? []) {
    try {
      await transitionSubscription(serviceClient, sub.id, 'expired', 'job:dunning', {})
      expired++
    } catch (err) {
      console.error(`dunning: falha ao expirar assinatura ${sub.id}:`, err)
    }
  }

  return jsonResponse({ checked_past_due: pastDue?.length ?? 0, emails_sent: emailsSent, paused, checked_paused: pausedSubs?.length ?? 0, expired })
})
