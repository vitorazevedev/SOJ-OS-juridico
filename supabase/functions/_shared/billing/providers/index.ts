// Modulo de Pagamentos, Fase 1 -- factory do gateway (spec secao 1/12,
// item "providers/index.ts: le PAYMENT_PROVIDER=mock|mercadopago").
// Default 'mock' -- so vira 'mercadopago' quando a Fase 6 (conta aprovada,
// MercadoPagoProvider implementado) existir. Hoje chamar getPaymentProvider()
// com PAYMENT_PROVIDER=mercadopago lanca erro claro, nao retorna um
// provider quebrado silenciosamente.

import type { PaymentProvider } from '../provider.ts'
import { MockProvider } from './mock.ts'

export function getPaymentProvider(): PaymentProvider {
  const configured = Deno.env.get('PAYMENT_PROVIDER') ?? 'mock'

  if (configured === 'mock') return new MockProvider()

  if (configured === 'mercadopago') {
    throw new Error(
      'PAYMENT_PROVIDER=mercadopago, mas MercadoPagoProvider ainda nao foi implementado (Fase 6 da spec, docs/PAGAMENTOS_SPEC.md). Use PAYMENT_PROVIDER=mock.'
    )
  }

  throw new Error(`PAYMENT_PROVIDER desconhecido: "${configured}". Valores aceitos: mock, mercadopago.`)
}
