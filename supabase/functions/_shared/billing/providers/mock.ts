// Modulo de Pagamentos, Fase 1 -- MockProvider (spec secao 3/11). Implementa
// toda a interface PaymentProvider em memoria, com IDs falsos (mock_*),
// para o resto do sistema poder ser construido e testado sem a conta real
// do Mercado Pago (ainda em aprovacao -- ver docs/billing-gap-report.md).
//
// Regras simuladas (spec secao 0/11): cartao de teste terminado em 0000
// aprova, 0001 recusa, 0002 fica em_process. Pix sempre "pendente" ate
// alguem (simulador de dev, Fase 2) marcar como pago.

import type {
  PaymentProvider,
  ProviderPayment,
  ProviderPixPayment,
  ProviderRefund,
  ProviderSubscription,
  ProviderChargeback,
  NormalizedWebhookEvent,
} from '../provider.ts'

type Params<K extends keyof PaymentProvider> = Parameters<PaymentProvider[K]>[0]

function mockId(prefix: string): string {
  return `mock_${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`
}

/** Cartoes de teste do mock: ultimos 4 digitos do token decidem o resultado. */
function outcomeFromCardToken(cardToken: string): 'approved' | 'rejected' | 'in_process' {
  if (cardToken.endsWith('0001')) return 'rejected'
  if (cardToken.endsWith('0002')) return 'in_process'
  return 'approved'
}

/**
 * Mapeia o campo `type` do corpo simulado (espelha o formato real de
 * webhook do Mercado Pago: { type, action, data: { id } }) pro
 * resourceType normalizado. O billing-dev-simulator (Fase 2) monta
 * corpos com esse formato.
 */
function mockResourceTypeFromBodyType(type: unknown): NormalizedWebhookEvent['resourceType'] {
  switch (type) {
    case 'payment': return 'payment'
    case 'subscription_preapproval': return 'subscription'
    case 'subscription_authorized_payment': return 'subscription_payment'
    case 'chargeback': return 'chargeback'
    default: return 'unknown'
  }
}

export class MockProvider implements PaymentProvider {
  readonly name = 'mock' as const

  // Overrides em memoria, usados SO pelo billing-dev-simulator (Fase 2):
  // ele cria/escolhe uma instancia de MockProvider, chama simulatePayment/
  // simulateSubscription pra dizer "quando perguntarem por este id, responda
  // isto", e na mesma chamada (mesma instancia, mesmo request) dispara
  // processWebhookEvent -- que entao chama getPayment/getSubscription e
  // recebe o resultado simulado. Sem tabela nova: dura so a vida do request.
  #paymentOverrides = new Map<string, Partial<ProviderPayment>>()
  #subscriptionOverrides = new Map<string, Partial<ProviderSubscription>>()
  #chargebackOverrides = new Map<string, Partial<ProviderChargeback>>()

  simulatePayment(providerPaymentId: string, patch: Partial<ProviderPayment>): void {
    this.#paymentOverrides.set(providerPaymentId, patch)
  }

  simulateSubscription(providerSubscriptionId: string, patch: Partial<ProviderSubscription>): void {
    this.#subscriptionOverrides.set(providerSubscriptionId, patch)
  }

  simulateChargeback(providerChargebackId: string, patch: Partial<ProviderChargeback>): void {
    this.#chargebackOverrides.set(providerChargebackId, patch)
  }

  upsertCustomer(_input: Params<'upsertCustomer'>) {
    return Promise.resolve({ providerCustomerId: mockId('cus') })
  }

  createCardPayment(input: Params<'createCardPayment'>): Promise<ProviderPayment> {
    const outcome = outcomeFromCardToken(input.cardToken)
    const status = outcome === 'approved' ? 'approved' : outcome === 'rejected' ? 'rejected' : 'in_process'
    const now = new Date()
    return Promise.resolve({
      providerPaymentId: mockId('pay'),
      status,
      statusDetail: outcome === 'rejected' ? 'cc_rejected_insufficient_amount' : undefined,
      method: 'card',
      amount: input.amount,
      netAmount: status === 'approved' ? Math.round(input.amount * 0.9502) : undefined, // taxa mock de cartao, 4,98%
      feeAmount: status === 'approved' ? Math.round(input.amount * 0.0498) : undefined,
      moneyReleaseDate: status === 'approved' ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) : undefined,
      approvedAt: status === 'approved' ? now : undefined,
      externalReference: input.externalReference,
      raw: { mock: true, cardToken: input.cardToken, idempotencyKey: input.idempotencyKey },
    })
  }

  createPixPayment(input: Params<'createPixPayment'>): Promise<ProviderPixPayment> {
    const providerPaymentId = mockId('pix')
    return Promise.resolve({
      providerPaymentId,
      status: 'pending',
      method: 'pix',
      amount: input.amount,
      externalReference: input.externalReference,
      pix: {
        qrCode: `PIX-MOCK-${providerPaymentId}`,
        qrCodeBase64: '',
        expiresAt: input.expiresAt,
      },
      raw: { mock: true, idempotencyKey: input.idempotencyKey },
    })
  }

  getPayment(providerPaymentId: string): Promise<ProviderPayment> {
    // Sem estado persistente real no mock puro -- devolve 'pending' como
    // resposta neutra, nunca inventando 'approved', A MENOS que o
    // billing-dev-simulator (Fase 2) tenha configurado um override pra
    // este id via simulatePayment() nesta mesma instancia/request.
    const override = this.#paymentOverrides.get(providerPaymentId)
    return Promise.resolve({
      providerPaymentId,
      status: 'pending',
      method: 'card',
      amount: 0,
      raw: { mock: true },
      ...override,
    })
  }

  refundPayment(input: Params<'refundPayment'>): Promise<ProviderRefund> {
    return Promise.resolve({
      providerRefundId: mockId('ref'),
      amount: input.amount ?? 0,
      status: 'approved',
      raw: { mock: true, idempotencyKey: input.idempotencyKey },
    })
  }

  createSubscription(input: Params<'createSubscription'>): Promise<ProviderSubscription> {
    return Promise.resolve({
      providerSubscriptionId: mockId('sub'),
      status: 'authorized',
      externalReference: input.externalReference,
      raw: { mock: true, idempotencyKey: input.idempotencyKey },
    })
  }

  getSubscription(providerSubscriptionId: string): Promise<ProviderSubscription> {
    const override = this.#subscriptionOverrides.get(providerSubscriptionId)
    return Promise.resolve({
      providerSubscriptionId,
      status: 'authorized',
      raw: { mock: true },
      ...override,
    })
  }

  updateSubscriptionCard(input: Params<'updateSubscriptionCard'>): Promise<ProviderSubscription> {
    return Promise.resolve({
      providerSubscriptionId: input.providerSubscriptionId,
      status: 'authorized',
      raw: { mock: true, cardToken: input.cardToken },
    })
  }

  updateSubscriptionAmount(input: Params<'updateSubscriptionAmount'>): Promise<ProviderSubscription> {
    return Promise.resolve({
      providerSubscriptionId: input.providerSubscriptionId,
      status: 'authorized',
      raw: { mock: true, amount: input.amount },
    })
  }

  cancelSubscription(providerSubscriptionId: string): Promise<ProviderSubscription> {
    return Promise.resolve({
      providerSubscriptionId,
      status: 'cancelled',
      raw: { mock: true },
    })
  }

  pauseSubscription(providerSubscriptionId: string): Promise<ProviderSubscription> {
    return Promise.resolve({
      providerSubscriptionId,
      status: 'paused',
      raw: { mock: true },
    })
  }

  verifyWebhook(_req: Params<'verifyWebhook'>): Promise<boolean> {
    // Mock nao recebe webhook real nenhum -- eventos simulados vem do
    // billing-dev-simulator (Fase 2), que chama o processador direto, sem
    // passar pelo endpoint HTTP. Sempre valido aqui por definicao.
    return Promise.resolve(true)
  }

  parseWebhook(req: Params<'parseWebhook'>): NormalizedWebhookEvent {
    const body = (req.body ?? {}) as Record<string, unknown>
    return {
      providerEventId: String(body.id ?? crypto.randomUUID()),
      resourceType: mockResourceTypeFromBodyType(body.type),
      resourceId: String((body.data as Record<string, unknown> | undefined)?.id ?? ''),
      action: typeof body.action === 'string' ? body.action : undefined,
      receivedAt: new Date(),
    }
  }

  getChargeback(providerChargebackId: string): Promise<ProviderChargeback> {
    const override = this.#chargebackOverrides.get(providerChargebackId)
    return Promise.resolve({
      providerChargebackId,
      status: 'opened',
      amount: 0,
      raw: { mock: true },
      ...override,
    })
  }
}
