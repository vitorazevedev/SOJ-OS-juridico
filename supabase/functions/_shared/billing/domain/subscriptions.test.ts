// Testes da maquina de estados (spec secao 5). Roda com:
//   deno test supabase/functions/_shared/billing/domain/subscriptions.test.ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { isValidTransition, type SubscriptionStatus } from './subscriptions.ts'

const ALL_STATUSES: SubscriptionStatus[] = [
  'incomplete', 'trialing', 'active', 'past_due', 'paused', 'canceled', 'expired',
]

Deno.test('mesma transicao (no-op) e sempre valida, inclusive em estados terminais', () => {
  for (const status of ALL_STATUSES) {
    assertEquals(isValidTransition(status, status), true, `${status} -> ${status} deveria ser valido`)
  }
})

Deno.test('transicoes validas do diagrama da spec', () => {
  const validEdges: [SubscriptionStatus, SubscriptionStatus][] = [
    ['incomplete', 'active'],
    ['incomplete', 'trialing'],
    ['incomplete', 'expired'],
    ['incomplete', 'paused'],
    ['trialing', 'active'],
    ['trialing', 'paused'],
    ['active', 'past_due'],
    ['active', 'canceled'],
    ['active', 'paused'],
    ['past_due', 'active'],
    ['past_due', 'paused'],
    ['paused', 'expired'],
  ]

  for (const [from, to] of validEdges) {
    assertEquals(isValidTransition(from, to), true, `${from} -> ${to} deveria ser valido`)
  }
})

Deno.test('estados terminais (canceled, expired) nao aceitam nenhuma transicao de saida', () => {
  for (const to of ALL_STATUSES) {
    if (to === 'canceled') continue
    assertEquals(isValidTransition('canceled', to), false, `canceled -> ${to} deveria ser invalido`)
  }
  for (const to of ALL_STATUSES) {
    if (to === 'expired') continue
    assertEquals(isValidTransition('expired', to), false, `expired -> ${to} deveria ser invalido`)
  }
})

Deno.test('transicoes invalidas nao desenhadas no diagrama da spec', () => {
  const invalidEdges: [SubscriptionStatus, SubscriptionStatus][] = [
    ['paused', 'active'], // so volta via reativacao real, nao esta no diagrama como aresta direta
    ['trialing', 'canceled'],
    ['trialing', 'expired'],
    ['past_due', 'canceled'],
    ['past_due', 'expired'],
    ['incomplete', 'canceled'],
  ]

  for (const [from, to] of invalidEdges) {
    assertEquals(isValidTransition(from, to), false, `${from} -> ${to} deveria ser invalido`)
  }
})
