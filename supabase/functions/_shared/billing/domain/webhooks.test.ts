// Testes do roteamento de webhook (spec secao 6, Peca 2). Roda com:
//   deno test supabase/functions/_shared/billing/domain/webhooks.test.ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { routeWebhookResourceType } from './webhooks.ts'

Deno.test('routeWebhookResourceType roteia payment e subscription_payment pra applyPaymentUpdate', () => {
  assertEquals(routeWebhookResourceType('payment'), 'apply_payment')
  assertEquals(routeWebhookResourceType('subscription_payment'), 'apply_subscription_payment')
})

Deno.test('routeWebhookResourceType roteia subscription pra transitionSubscription', () => {
  assertEquals(routeWebhookResourceType('subscription'), 'apply_subscription')
})

Deno.test('routeWebhookResourceType ignora chargeback (Fase 5 ainda nao implementada) e desconhecido', () => {
  assertEquals(routeWebhookResourceType('chargeback'), 'ignore')
  assertEquals(routeWebhookResourceType('unknown'), 'ignore')
  assertEquals(routeWebhookResourceType('algo_nao_mapeado'), 'ignore')
})
