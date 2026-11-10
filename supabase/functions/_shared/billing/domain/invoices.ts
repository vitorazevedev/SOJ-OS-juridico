// Modulo de Pagamentos, Fase 5c -- emissao de UMA nota fiscal da fila
// (spec Peca 10). Compartilhado entre issue-invoices (job real) e
// billing-dev-simulator (dispara na hora, sem esperar os 5 min do cron) --
// mesmo padrao ja usado pra webhooks: o simulador chama o processador
// real, nao um caminho paralelo.

import type { InvoiceProvider } from '../invoiceProvider.ts'

// deno-lint-ignore no-explicit-any
type SupabaseClient = any

function fmtBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

async function sendInvoiceEmail(to: string, number: string, amountCents: number, resendKey: string): Promise<void> {
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Ponderum <contato@ponderum.com>',
        to: [to],
        subject: 'Nota fiscal emitida — Ponderum',
        html: `
          <div style="background:#0b1220;padding:40px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
            <div style="max-width:480px;margin:0 auto;background:#101a2c;border:1px solid #1e2a3f;border-radius:16px;padding:32px;color:#e5e9f0">
              <p style="font-size:14px;line-height:1.6;color:#aeb8c9">
                A nota fiscal nº ${number} (${fmtBRL(amountCents)}) referente ao seu pagamento já está disponível em Configurações → Plano → Notas fiscais.
              </p>
              <a href="https://app.ponderum.com/settings?tab=plan" style="display:inline-block;margin-top:16px;background:#00e5a0;color:#04120c;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Ver nota fiscal</a>
            </div>
          </div>
        `,
      }),
    })
  } catch (err) {
    console.error('issueFiscalInvoice: falha ao enviar e-mail (não bloqueante):', err)
  }
}

export async function issueFiscalInvoice(
  serviceClient: SupabaseClient,
  provider: InvoiceProvider,
  resendKey: string | undefined,
  row: { id: string; organization_id: string; payment_id: string; attempts: number },
): Promise<boolean> {
  const { data: payment } = await serviceClient
    .from('payments')
    .select('amount_cents, method')
    .eq('id', row.payment_id)
    .maybeSingle()
  const { data: customer } = await serviceClient
    .from('billing_customers')
    .select('legal_name, document_type, document_number, email, address')
    .eq('organization_id', row.organization_id)
    .maybeSingle()

  if (!payment || !customer) {
    await serviceClient.from('fiscal_invoices').update({
      status: 'error',
      attempts: row.attempts + 1,
      last_error: !payment ? 'pagamento não encontrado' : 'dados de faturamento (billing_customers) não encontrados',
      updated_at: new Date().toISOString(),
    }).eq('id', row.id)
    return false
  }

  try {
    const issued = await provider.issue({
      idempotencyKey: row.id,
      amountCents: payment.amount_cents,
      description: `Assinatura Ponderum (${payment.method === 'pix' ? 'Pix' : 'cartão'})`,
      tomador: {
        legalName: customer.legal_name,
        documentType: customer.document_type,
        documentNumber: customer.document_number,
        email: customer.email,
        address: customer.address,
      },
      externalReference: row.id,
    })

    await serviceClient.from('fiscal_invoices').update({
      provider_invoice_id: issued.providerInvoiceId,
      status: issued.status,
      number: issued.number ?? null,
      verification_code: issued.verificationCode ?? null,
      pdf_url: issued.pdfUrl ?? null,
      xml_url: issued.xmlUrl ?? null,
      issued_at: issued.status === 'issued' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }).eq('id', row.id)

    if (issued.status === 'issued' && issued.number) {
      // Espelha em `invoices` -- a aba "Notas fiscais" (Configurações >
      // Plano) já existe e já lê dessa tabela (fluxo manual,
      // staff_create_invoice). file_path com prefixo 'mock-nfse:' avisa o
      // front pra gerar o PDF simulado no cliente (não existe arquivo
      // real no Storage pra uma nota mock).
      await serviceClient.from('invoices').insert({
        org_id: row.organization_id,
        numero_nota: issued.number,
        valor_cents: payment.amount_cents,
        data_emissao: new Date().toISOString().slice(0, 10),
        file_path: `mock-nfse:${row.id}`,
      })

      if (resendKey && customer.email) {
        await sendInvoiceEmail(customer.email, issued.number, payment.amount_cents, resendKey)
      }
    }

    return issued.status === 'issued'
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await serviceClient.from('fiscal_invoices').update({
      status: 'error',
      attempts: row.attempts + 1,
      last_error: message,
      updated_at: new Date().toISOString(),
    }).eq('id', row.id)
    return false
  }
}
