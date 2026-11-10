import type { InvoiceProvider, IssueInvoiceInput, IssuedInvoice } from '../invoiceProvider.ts'

// Modulo de Pagamentos, Fase 5c -- MockInvoiceProvider. Emite na hora
// (nao simula fila real nem atraso -- quem simula fila e o job
// issue-invoices, no banco). IDs/numero/codigo de verificacao falsos,
// nunca parecidos com o formato real de NFS-e de nenhum municipio
// especifico, pra nao ser confundido com documento fiscal de verdade.

function mockId(prefix: string): string {
  return `mock_${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`
}

export class MockInvoiceProvider implements InvoiceProvider {
  readonly name = 'mock' as const

  issue(input: IssueInvoiceInput): Promise<IssuedInvoice> {
    return Promise.resolve({
      providerInvoiceId: mockId('nfse'),
      status: 'issued',
      number: `SIMULADO-${Date.now().toString().slice(-8)}`,
      verificationCode: crypto.randomUUID().slice(0, 8).toUpperCase(),
      raw: { mock: true, idempotencyKey: input.idempotencyKey },
    })
  }

  get(providerInvoiceId: string): Promise<IssuedInvoice> {
    return Promise.resolve({
      providerInvoiceId,
      status: 'issued',
      raw: { mock: true },
    })
  }

  cancel(providerInvoiceId: string): Promise<IssuedInvoice> {
    return Promise.resolve({
      providerInvoiceId,
      status: 'canceled',
      raw: { mock: true },
    })
  }
}
