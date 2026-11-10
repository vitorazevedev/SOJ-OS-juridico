// Modulo de Pagamentos, Fase 1 -- maquina de estados de assinatura (spec
// secao 5). Toda mudanca de status passa por transitionSubscription():
// valida a transicao, grava billing_audit_log (Principio 7), e e
// idempotente (mesmo estado = no-op, conforme a spec).

// deno-lint-ignore no-explicit-any
type SupabaseClient = any // tipagem completa do supabase-js nao exportada aqui -- ver uso em outras Edge Functions do projeto

export type SubscriptionStatus =
  | 'incomplete' | 'trialing' | 'active' | 'past_due' | 'paused' | 'canceled' | 'expired'

// DECISAO EM ABERTO DA SPEC (secao 13, #4) ainda nao confirmada pelo
// Vitor -- usando o valor sugerido pela propria spec como placeholder,
// registrado em docs/billing-decisions.md.
export const DUNNING_GRACE_PERIOD_DAYS = 7

// Transicoes permitidas, exatamente como desenhadas no diagrama da spec
// (secao 5) -- nao inventar aresta que nao esta la.
const ALLOWED_TRANSITIONS: Record<SubscriptionStatus, ReadonlySet<SubscriptionStatus>> = {
  incomplete: new Set(['active', 'trialing', 'expired', 'paused']),
  trialing: new Set(['active', 'paused']),
  active: new Set(['active', 'past_due', 'canceled', 'paused']),
  past_due: new Set(['active', 'paused']),
  paused: new Set(['expired']),
  canceled: new Set([]),
  expired: new Set([]),
}

export function isValidTransition(from: SubscriptionStatus, to: SubscriptionStatus): boolean {
  if (from === to) return true // idempotente
  return ALLOWED_TRANSITIONS[from]?.has(to) ?? false
}

export async function transitionSubscription(
  client: SupabaseClient,
  subscriptionId: string,
  to: SubscriptionStatus,
  actor: string,
  metadata?: Record<string, unknown>,
): Promise<{ changed: boolean; from: SubscriptionStatus | null }> {
  const { data: current, error: fetchErr } = await client
    .from('subscriptions')
    .select('id, organization_id, status')
    .eq('id', subscriptionId)
    .maybeSingle()

  if (fetchErr) throw new Error(`transitionSubscription: erro ao buscar assinatura ${subscriptionId} — ${fetchErr.message}`)
  if (!current) throw new Error(`transitionSubscription: assinatura ${subscriptionId} não encontrada`)

  const from = current.status as SubscriptionStatus

  if (from === to) {
    return { changed: false, from } // mesmo estado = no-op, conforme a spec
  }

  if (!isValidTransition(from, to)) {
    throw new Error(`transitionSubscription: transição inválida de "${from}" para "${to}" (assinatura ${subscriptionId})`)
  }

  const updatePayload: Record<string, unknown> = { status: to, updated_at: new Date().toISOString() }
  if (to === 'past_due') {
    const now = new Date()
    updatePayload.past_due_since = now.toISOString()
    updatePayload.grace_period_ends_at = new Date(now.getTime() + DUNNING_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000).toISOString()
  }
  if (to === 'canceled') {
    updatePayload.canceled_at = new Date().toISOString()
  }

  const { error: updateErr } = await client
    .from('subscriptions')
    .update(updatePayload)
    .eq('id', subscriptionId)

  if (updateErr) throw new Error(`transitionSubscription: falha ao atualizar assinatura ${subscriptionId} — ${updateErr.message}`)

  // Auditoria (Principio 7) -- nao bloqueia a transicao se falhar, mas
  // loga alto, ja que perder uma linha de audit log e um problema real a
  // investigar, nao um erro pra reverter a transicao que ja aconteceu.
  const { error: auditErr } = await client.from('billing_audit_log').insert({
    organization_id: current.organization_id,
    entity: 'subscription',
    entity_id: subscriptionId,
    from_status: from,
    to_status: to,
    actor,
    metadata: metadata ?? null,
  })
  if (auditErr) console.error(`transitionSubscription: falha ao gravar billing_audit_log (não bloqueante) para ${subscriptionId}:`, auditErr)

  return { changed: true, from }
}
