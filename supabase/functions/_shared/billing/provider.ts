// Modulo de Pagamentos, Fase 1 -- interface PaymentProvider (spec secao 3,
// docs/PAGAMENTOS_SPEC.md). Toda regra de negocio chama ESTA interface,
// nunca o SDK/API do gateway direto (Principio 5 da spec). Nesta fase
// nenhum consumidor real ainda chama isso -- create-mercadopago-subscription
// so sera refatorada para usar a interface numa fase futura (fora do
// escopo da Fase 1, ver docs/billing-gap-report.md).

export type Cents = number

export type PayerInfo = {
  email: string
  name: string
  document: string // CPF ou CNPJ, so digitos
  documentType: 'CPF' | 'CNPJ'
}

export type ProviderPaymentStatus =
  | 'pending' | 'approved' | 'authorized' | 'in_process' | 'in_mediation'
  | 'rejected' | 'cancelled' | 'refunded' | 'charged_back'

export type ProviderPayment = {
  providerPaymentId: string
  status: ProviderPaymentStatus
  statusDetail?: string
  method: 'card' | 'pix'
  amount: Cents
  netAmount?: Cents
  feeAmount?: Cents
  moneyReleaseDate?: Date
  approvedAt?: Date
  externalReference?: string
  providerSubscriptionId?: string
  card?: { brand: string; last4: string; expMonth: number; expYear: number }
  raw: unknown
}

export type ProviderPixPayment = ProviderPayment & {
  pix: { qrCode: string; qrCodeBase64: string; ticketUrl?: string; expiresAt: Date }
}

export type ProviderRefund = {
  providerRefundId: string
  amount: Cents
  status: string
  raw: unknown
}

export type ProviderSubscriptionStatus = 'pending' | 'authorized' | 'paused' | 'cancelled'

export type ProviderSubscription = {
  providerSubscriptionId: string
  status: ProviderSubscriptionStatus
  externalReference?: string
  nextPaymentDate?: Date
  raw: unknown
}

export type ProviderChargeback = {
  providerChargebackId: string
  status: string
  amount: Cents
  reason?: string
  documentationDueAt?: Date
  // Fase 5a -- o pagamento que a contestacao se refere (provider_payment_id
  // do gateway). Sem isso o webhook de chargeback nao sabe qual payments
  // marcar -- era por isso que routeWebhookResourceType tratava 'chargeback'
  // como 'ignore' desde a Fase 2.
  providerPaymentId?: string
  raw: unknown
}

export type NormalizedWebhookEvent = {
  providerEventId: string
  resourceType: 'payment' | 'subscription' | 'subscription_payment' | 'chargeback' | 'unknown'
  resourceId: string
  action?: string
  receivedAt: Date
}

export interface PaymentProvider {
  readonly name: 'mock' | 'mercadopago'

  upsertCustomer(input: {
    userId: string
    email: string
    name: string
    document: string
  }): Promise<{ providerCustomerId: string }>

  createCardPayment(input: {
    idempotencyKey: string
    amount: Cents
    description: string
    cardToken: string
    installments: number
    payer: PayerInfo
    externalReference: string
  }): Promise<ProviderPayment>

  createPixPayment(input: {
    idempotencyKey: string
    amount: Cents
    description: string
    payer: PayerInfo
    expiresAt: Date
    externalReference: string
  }): Promise<ProviderPixPayment>

  getPayment(providerPaymentId: string): Promise<ProviderPayment>

  refundPayment(input: {
    idempotencyKey: string
    providerPaymentId: string
    amount?: Cents
  }): Promise<ProviderRefund>

  createSubscription(input: {
    idempotencyKey: string
    planCode: string
    amount: Cents
    frequency: 1
    frequencyType: 'months'
    cardToken: string
    payerEmail: string
    externalReference: string
    startDate?: Date
  }): Promise<ProviderSubscription>

  getSubscription(providerSubscriptionId: string): Promise<ProviderSubscription>

  updateSubscriptionCard(input: {
    providerSubscriptionId: string
    cardToken: string
  }): Promise<ProviderSubscription>

  updateSubscriptionAmount(input: {
    providerSubscriptionId: string
    amount: Cents
  }): Promise<ProviderSubscription>

  cancelSubscription(providerSubscriptionId: string): Promise<ProviderSubscription>

  pauseSubscription(providerSubscriptionId: string): Promise<ProviderSubscription>

  verifyWebhook(req: { headers: Headers; query: URLSearchParams; rawBody: string }): Promise<boolean>

  parseWebhook(req: { headers: Headers; query: URLSearchParams; body: unknown }): NormalizedWebhookEvent

  getChargeback(providerChargebackId: string): Promise<ProviderChargeback>
}
