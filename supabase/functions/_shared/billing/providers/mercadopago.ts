// Modulo de Pagamentos, Fase 6 -- MercadoPagoProvider. Implementa a mesma
// interface PaymentProvider que o MockProvider ja passa (Principio 5 da
// spec: regra de negocio nunca chama o SDK/API do MP direto, so por aqui).
// Endpoints e algoritmo de assinatura conforme docs/PAGAMENTOS_SPEC.md,
// secao 6 (Pecas 1, 2, 5, 7, 8). Testado contra credenciais de TESTE do
// Mercado Pago antes de qualquer uso em producao -- ver checklist de
// go-live na secao 12 da spec.

import type {
  PaymentProvider,
  ProviderPayment,
  ProviderPixPayment,
  ProviderRefund,
  ProviderSubscription,
  ProviderSubscriptionStatus,
  ProviderChargeback,
  ProviderPaymentStatus,
  NormalizedWebhookEvent,
  PayerInfo,
} from '../provider.ts'

type Params<K extends keyof PaymentProvider> = Parameters<PaymentProvider[K]>[0]

const MP_API = 'https://api.mercadopago.com'
const REQUEST_TIMEOUT_MS = 10_000
const MAX_RETRIES = 2 // so em erro de rede/5xx -- Peca 1 da spec

// MP devolve/recebe valor em reais (float), nos guardamos tudo em centavos
// (Principio 6 da spec: dinheiro em centavos, integer, nunca float).
function centsToReais(cents: number): number {
  return Math.round(cents) / 100
}
function reaisToCents(reais: number | undefined | null): number | undefined {
  if (reais == null) return undefined
  return Math.round(reais * 100)
}

/** CPF tem 11 digitos, CNPJ tem 14 -- a interface upsertCustomer nao recebe o tipo separado. */
function documentTypeFromDigits(document: string): 'CPF' | 'CNPJ' {
  return document.replace(/\D/g, '').length > 11 ? 'CNPJ' : 'CPF'
}

function accessToken(): string {
  const token = Deno.env.get('MP_ACCESS_TOKEN')
  if (!token) throw new Error('MP_ACCESS_TOKEN não configurado nos secrets da Edge Function.')
  return token
}

type MpRequestOptions = {
  method?: string
  body?: unknown
  idempotencyKey?: string
}

/**
 * Chamada autenticada à API do MP. POST/PUT com idempotencyKey retry em
 * erro de rede/5xx (ate MAX_RETRIES vezes, backoff simples) -- GET nunca
 * precisa, idempotente por natureza. Erro 4xx nunca é retentado (é erro de
 * dado nosso, repetir não resolve).
 */
async function mpRequest<T>(path: string, options: MpRequestOptions = {}): Promise<T> {
  const { method = 'GET', body, idempotencyKey } = options
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken()}`,
    'Content-Type': 'application/json',
  }
  if (idempotencyKey) headers['X-Idempotency-Key'] = idempotencyKey

  let lastErr: unknown
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(`${MP_API}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
      const text = await res.text()
      const json = text ? JSON.parse(text) : {}
      if (!res.ok) {
        // 5xx -- vale tentar de novo (mesma idempotency key); 4xx nunca.
        if (res.status >= 500 && attempt < MAX_RETRIES) {
          lastErr = new Error(`MP ${method} ${path} -> ${res.status}: ${text}`)
          await new Promise((r) => setTimeout(r, 300 * (attempt + 1)))
          continue
        }
        throw new Error(`MP ${method} ${path} -> ${res.status}: ${text}`)
      }
      return json as T
    } catch (err) {
      lastErr = err
      if (attempt >= MAX_RETRIES) break
      await new Promise((r) => setTimeout(r, 300 * (attempt + 1)))
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr))
}

// Os valores reais de status do MP (pagamento e preapproval) ja sao
// exatamente os mesmos nomes dos unions ProviderPaymentStatus/
// ProviderSubscriptionStatus definidos em provider.ts (a spec modelou os
// tipos em cima da API real) -- por isso o mapeamento abaixo e so uma
// validacao/cast, nao uma traducao de valores.
function toProviderPaymentStatus(mpStatus: string): ProviderPaymentStatus {
  const known: ProviderPaymentStatus[] = [
    'pending', 'approved', 'authorized', 'in_process', 'in_mediation',
    'rejected', 'cancelled', 'refunded', 'charged_back',
  ]
  return (known as string[]).includes(mpStatus) ? (mpStatus as ProviderPaymentStatus) : 'pending'
}

function toProviderSubscriptionStatus(mpStatus: string): ProviderSubscriptionStatus {
  const known: ProviderSubscriptionStatus[] = ['pending', 'authorized', 'paused', 'cancelled']
  return (known as string[]).includes(mpStatus) ? (mpStatus as ProviderSubscriptionStatus) : 'pending'
}

type MpPayment = {
  id: number | string
  status: string
  status_detail?: string
  payment_method_id?: string
  transaction_amount: number
  fee_details?: { amount: number }[]
  transaction_details?: { net_received_amount?: number }
  money_release_date?: string
  date_approved?: string
  external_reference?: string
  // Confirmado ao vivo (GET /v1/payments/{id} de um pagamento real de
  // assinatura): NAO existe `preapproval_id` no nivel raiz do pagamento --
  // o vinculo com a assinatura vem aninhado em
  // point_of_interaction.transaction_data.subscription_id.
  preapproval_id?: string
  card?: { first_six_digits?: string; last_four_digits?: string; expiration_month?: number; expiration_year?: number }
  point_of_interaction?: {
    transaction_data?: { qr_code?: string; qr_code_base64?: string; ticket_url?: string; subscription_id?: string }
  }
  date_of_expiration?: string
}

function mapMpPayment(p: MpPayment): ProviderPayment {
  const feeTotal = (p.fee_details ?? []).reduce((sum, f) => sum + (f.amount ?? 0), 0)
  return {
    providerPaymentId: String(p.id),
    status: toProviderPaymentStatus(p.status),
    statusDetail: p.status_detail,
    method: p.payment_method_id === 'pix' ? 'pix' : 'card',
    amount: reaisToCents(p.transaction_amount) ?? 0,
    netAmount: reaisToCents(p.transaction_details?.net_received_amount),
    feeAmount: feeTotal ? reaisToCents(feeTotal) : undefined,
    moneyReleaseDate: p.money_release_date ? new Date(p.money_release_date) : undefined,
    approvedAt: p.date_approved ? new Date(p.date_approved) : undefined,
    externalReference: p.external_reference,
    providerSubscriptionId: p.preapproval_id ?? p.point_of_interaction?.transaction_data?.subscription_id,
    card: p.card
      ? {
          brand: '', // MP nao devolve bandeira no objeto de pagamento, so os digitos
          last4: p.card.last_four_digits ?? '',
          expMonth: p.card.expiration_month ?? 0,
          expYear: p.card.expiration_year ?? 0,
        }
      : undefined,
    raw: p,
  }
}

type MpPreapproval = {
  id: string
  status: string
  external_reference?: string
  next_payment_date?: string
}

function mapMpPreapproval(s: MpPreapproval): ProviderSubscription {
  return {
    providerSubscriptionId: s.id,
    status: toProviderSubscriptionStatus(s.status),
    externalReference: s.external_reference,
    nextPaymentDate: s.next_payment_date ? new Date(s.next_payment_date) : undefined,
    raw: s,
  }
}

function payerPayload(payer: PayerInfo) {
  return {
    email: payer.email,
    first_name: payer.name,
    identification: { type: payer.documentType, number: payer.document },
  }
}

export class MercadoPagoProvider implements PaymentProvider {
  readonly name = 'mercadopago' as const

  async upsertCustomer(input: Params<'upsertCustomer'>): Promise<{ providerCustomerId: string }> {
    const documentType = documentTypeFromDigits(input.document)
    const customer = await mpRequest<{ id: string }>('/v1/customers', {
      method: 'POST',
      body: {
        email: input.email,
        first_name: input.name,
        identification: { type: documentType, number: input.document },
      },
    })
    return { providerCustomerId: customer.id }
  }

  async createCardPayment(input: Params<'createCardPayment'>): Promise<ProviderPayment> {
    const payment = await mpRequest<MpPayment>('/v1/payments', {
      method: 'POST',
      idempotencyKey: input.idempotencyKey,
      body: {
        transaction_amount: centsToReais(input.amount),
        description: input.description,
        token: input.cardToken,
        installments: input.installments,
        payer: payerPayload(input.payer),
        external_reference: input.externalReference,
        additional_info: { items: [{ title: input.description }] },
      },
    })
    return mapMpPayment(payment)
  }

  async createPixPayment(input: Params<'createPixPayment'>): Promise<ProviderPixPayment> {
    const payment = await mpRequest<MpPayment>('/v1/payments', {
      method: 'POST',
      idempotencyKey: input.idempotencyKey,
      body: {
        transaction_amount: centsToReais(input.amount),
        description: input.description,
        payment_method_id: 'pix',
        payer: payerPayload(input.payer),
        external_reference: input.externalReference,
        date_of_expiration: input.expiresAt.toISOString(),
      },
    })
    const qr = payment.point_of_interaction?.transaction_data
    return {
      ...mapMpPayment(payment),
      pix: {
        qrCode: qr?.qr_code ?? '',
        qrCodeBase64: qr?.qr_code_base64 ?? '',
        ticketUrl: qr?.ticket_url,
        expiresAt: input.expiresAt,
      },
    }
  }

  async getPayment(providerPaymentId: string): Promise<ProviderPayment> {
    const payment = await mpRequest<MpPayment>(`/v1/payments/${providerPaymentId}`)
    return mapMpPayment(payment)
  }

  async refundPayment(input: Params<'refundPayment'>): Promise<ProviderRefund> {
    const refund = await mpRequest<{ id: number | string; amount: number; status: string }>(
      `/v1/payments/${input.providerPaymentId}/refunds`,
      {
        method: 'POST',
        idempotencyKey: input.idempotencyKey,
        body: input.amount != null ? { amount: centsToReais(input.amount) } : {},
      }
    )
    return {
      providerRefundId: String(refund.id),
      amount: reaisToCents(refund.amount) ?? input.amount ?? 0,
      status: refund.status,
      raw: refund,
    }
  }

  async createSubscription(input: Params<'createSubscription'>): Promise<ProviderSubscription> {
    const preapproval = await mpRequest<MpPreapproval>('/preapproval', {
      method: 'POST',
      idempotencyKey: input.idempotencyKey,
      body: {
        reason: input.planCode,
        external_reference: input.externalReference,
        payer_email: input.payerEmail,
        card_token_id: input.cardToken,
        // Obrigatorio pro MP mesmo quando a assinatura ja nasce "authorized"
        // via card_token_id (sem redirecionar o usuario pra lugar nenhum) --
        // confirmado ao vivo: POST /preapproval sem isso devolve 400
        // "back_url is required".
        back_url: 'https://app.ponderum.com/settings?tab=plan',
        auto_recurring: {
          frequency: input.frequency,
          frequency_type: input.frequencyType,
          transaction_amount: centsToReais(input.amount),
          currency_id: 'BRL',
          start_date: input.startDate?.toISOString(),
        },
        status: 'authorized',
      },
    })
    return mapMpPreapproval(preapproval)
  }

  async getSubscription(providerSubscriptionId: string): Promise<ProviderSubscription> {
    const preapproval = await mpRequest<MpPreapproval>(`/preapproval/${providerSubscriptionId}`)
    return mapMpPreapproval(preapproval)
  }

  async updateSubscriptionCard(input: Params<'updateSubscriptionCard'>): Promise<ProviderSubscription> {
    const preapproval = await mpRequest<MpPreapproval>(`/preapproval/${input.providerSubscriptionId}`, {
      method: 'PUT',
      body: { card_token_id: input.cardToken },
    })
    return mapMpPreapproval(preapproval)
  }

  async updateSubscriptionAmount(input: Params<'updateSubscriptionAmount'>): Promise<ProviderSubscription> {
    const preapproval = await mpRequest<MpPreapproval>(`/preapproval/${input.providerSubscriptionId}`, {
      method: 'PUT',
      body: { auto_recurring: { transaction_amount: centsToReais(input.amount) } },
    })
    return mapMpPreapproval(preapproval)
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<ProviderSubscription> {
    const preapproval = await mpRequest<MpPreapproval>(`/preapproval/${providerSubscriptionId}`, {
      method: 'PUT',
      body: { status: 'cancelled' },
    })
    return mapMpPreapproval(preapproval)
  }

  async pauseSubscription(providerSubscriptionId: string): Promise<ProviderSubscription> {
    const preapproval = await mpRequest<MpPreapproval>(`/preapproval/${providerSubscriptionId}`, {
      method: 'PUT',
      body: { status: 'paused' },
    })
    return mapMpPreapproval(preapproval)
  }

  /**
   * Algoritmo de assinatura do MP (docs/PAGAMENTOS_SPEC.md, Peca 2):
   * manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`, v1 =
   * HMAC-SHA256(manifest, MP_WEBHOOK_SECRET) em hex, comparado com
   * timingSafeEqual. Rejeita ts com mais de 5 min de diferenca. Pix nao
   * manda assinatura verificavel -- a seguranca nesse caso vem de SEMPRE
   * fazer GET na API antes de aplicar qualquer efeito (processWebhookEvent
   * nunca confia no corpo do webhook, so no GET).
   */
  async verifyWebhook(req: Params<'verifyWebhook'>): Promise<boolean> {
    const secret = Deno.env.get('MP_WEBHOOK_SECRET')
    if (!secret) {
      console.error('MercadoPagoProvider.verifyWebhook: MP_WEBHOOK_SECRET não configurado -- rejeitando por segurança.')
      return false
    }

    const signatureHeader = req.headers.get('x-signature')
    const requestId = req.headers.get('x-request-id')
    if (!signatureHeader || !requestId) return false

    const parts: Record<string, string> = {}
    for (const piece of signatureHeader.split(',')) {
      const [key, value] = piece.split('=').map((s) => s.trim())
      if (key && value) parts[key] = value
    }
    const ts = parts.ts
    const v1 = parts.v1
    if (!ts || !v1) return false

    // ts com mais de 5 min de diferenca -- rejeita (replay antigo).
    const tsMs = Number(ts) * 1000
    if (!Number.isFinite(tsMs) || Math.abs(Date.now() - tsMs) > 5 * 60 * 1000) return false

    let dataId = req.query.get('data.id') ?? req.query.get('id') ?? ''
    if (/^[a-zA-Z0-9]+$/.test(dataId)) dataId = dataId.toLowerCase()

    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const signatureBytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(manifest))
    const computed = Array.from(new Uint8Array(signatureBytes))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    return timingSafeEqualHex(computed, v1)
  }

  parseWebhook(req: Params<'parseWebhook'>): NormalizedWebhookEvent {
    const body = (req.body ?? {}) as Record<string, unknown>
    const data = body.data as Record<string, unknown> | undefined
    const type = typeof body.type === 'string' ? body.type : ''
    const resourceType: NormalizedWebhookEvent['resourceType'] =
      type === 'payment' ? 'payment'
      : type === 'subscription_preapproval' ? 'subscription'
      : type === 'subscription_authorized_payment' ? 'subscription_payment'
      : type === 'topic_chargebacks_wh' || type === 'chargeback' ? 'chargeback'
      : 'unknown'

    return {
      providerEventId: String(body.id ?? req.query.get('id') ?? crypto.randomUUID()),
      resourceType,
      resourceId: String(data?.id ?? req.query.get('data.id') ?? ''),
      action: typeof body.action === 'string' ? body.action : undefined,
      receivedAt: new Date(),
    }
  }

  async getChargeback(providerChargebackId: string): Promise<ProviderChargeback> {
    const cb = await mpRequest<{
      id: string
      status: string
      amount: number
      reason?: string
      documentation_due_date?: string
      payment_id?: number | string
    }>(`/v1/chargebacks/${providerChargebackId}`)
    return {
      providerChargebackId: cb.id,
      status: cb.status,
      amount: reaisToCents(cb.amount) ?? 0,
      reason: cb.reason,
      documentationDueAt: cb.documentation_due_date ? new Date(cb.documentation_due_date) : undefined,
      providerPaymentId: cb.payment_id ? String(cb.payment_id) : undefined,
      raw: cb,
    }
  }
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
