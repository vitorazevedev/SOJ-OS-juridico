// Modulo de Pagamentos, Fase 6 -- factory do gateway (spec secao 1/12,
// item "providers/index.ts: le PAYMENT_PROVIDER=mock|mercadopago").
// Default 'mock' -- so vira 'mercadopago' quando o secret PAYMENT_PROVIDER
// for explicitamente setado (ver checklist de go-live, spec secao 12).

import type { PaymentProvider } from '../provider.ts'
import { MockProvider } from './mock.ts'
import { MercadoPagoProvider } from './mercadopago.ts'

export function getPaymentProvider(): PaymentProvider {
  const configured = Deno.env.get('PAYMENT_PROVIDER') ?? 'mock'

  if (configured === 'mock') return new MockProvider()
  if (configured === 'mercadopago') return new MercadoPagoProvider()

  throw new Error(`PAYMENT_PROVIDER desconhecido: "${configured}". Valores aceitos: mock, mercadopago.`)
}
