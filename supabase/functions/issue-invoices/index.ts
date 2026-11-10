import { createClient } from 'npm:@supabase/supabase-js@2'
import { MockInvoiceProvider } from '../_shared/billing/invoiceProviders/mock.ts'
import { issueFiscalInvoice } from '../_shared/billing/domain/invoices.ts'

// Modulo de Pagamentos, Fase 5c -- fila de emissao de NFS-e (spec Peca 10,
// secao 9: "issue-invoices | a cada 5 min"). Provedor ainda e so o mock
// (decisao de provedor real pendente do contador, docs/billing-decisions.md).
// Nunca bloqueia acesso do cliente por erro de nota -- so loga e tenta de
// novo ate 5x. Logica de emissao de UMA nota em
// _shared/billing/domain/invoices.ts, compartilhada com billing-dev-simulator.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

const MAX_ATTEMPTS = 5

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const cronSecret = Deno.env.get('CRON_SECRET')
  if (req.headers.get('x-cron-secret') !== cronSecret) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const serviceClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  const resendKey = Deno.env.get('RESEND_API_KEY')
  const provider = new MockInvoiceProvider()

  const { data: pending, error } = await serviceClient
    .from('fiscal_invoices')
    .select('id, organization_id, payment_id, attempts')
    .in('status', ['queued', 'error'])
    .lt('attempts', MAX_ATTEMPTS)
    .limit(50)

  if (error) {
    console.error('issue-invoices: falha ao buscar fila:', error)
    return jsonResponse({ error: 'erro ao buscar fila' }, 500)
  }

  let issued = 0
  for (const row of pending ?? []) {
    if (await issueFiscalInvoice(serviceClient, provider, resendKey, row)) issued++
  }

  return jsonResponse({ checked: pending?.length ?? 0, issued })
})
