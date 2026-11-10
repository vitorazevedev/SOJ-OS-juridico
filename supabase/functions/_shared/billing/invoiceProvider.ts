// Modulo de Pagamentos, Fase 5c -- interface InvoiceProvider (spec Peca
// 10). Provedor de NFS-e ainda nao escolhido (decisao do contador, spec
// secao 13 item 6, registrada em docs/billing-decisions.md) -- por isso
// atras de interface, igual PaymentProvider: hoje so MockInvoiceProvider.

export type TomadorInfo = {
  legalName: string
  documentType: 'CPF' | 'CNPJ'
  documentNumber: string
  email: string
  address: unknown
}

export type IssueInvoiceInput = {
  idempotencyKey: string
  amountCents: number
  description: string
  tomador: TomadorInfo
  externalReference: string // = fiscal_invoices.id
}

export type InvoiceStatus = 'queued' | 'processing' | 'issued' | 'error' | 'canceled'

export type IssuedInvoice = {
  providerInvoiceId: string
  status: InvoiceStatus
  number?: string
  verificationCode?: string
  pdfUrl?: string
  xmlUrl?: string
  raw: unknown
}

export interface InvoiceProvider {
  readonly name: 'mock' | string
  issue(input: IssueInvoiceInput): Promise<IssuedInvoice>
  get(providerInvoiceId: string): Promise<IssuedInvoice>
  cancel(providerInvoiceId: string): Promise<IssuedInvoice>
}
