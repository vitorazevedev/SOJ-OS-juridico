import { createClient } from 'npm:@supabase/supabase-js@2'
import { getPaymentProvider } from '../_shared/billing/providers/index.ts'
import { recordWebhookEvent, processWebhookEvent } from '../_shared/billing/domain/webhooks.ts'

// Modulo de Pagamentos, Fase 2 -- endpoint publico que recebe webhooks do
// gateway (spec secao 6, Peca 2). Publica e sem JWT (verify_jwt=false em
// supabase/config.toml) porque o Mercado Pago chama sem Authorization
// header. Fluxo: ler corpo bruto -> verificar assinatura -> gravar (dedup
// por provider+provider_event_id) -> responder 200 rapido -> processar.

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return jsonResponse({ error: 'method not allowed' }, 405)

  const serviceClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const rawBody = await req.text()
  let parsedBody: unknown = {}
  try {
    parsedBody = rawBody ? JSON.parse(rawBody) : {}
  } catch {
    parsedBody = {}
  }
  const query = new URL(req.url).searchParams
  const provider = getPaymentProvider()

  // Principio 3 da spec -- nunca confiar no corpo: ainda assim o corpo e
  // gravado em payload pra auditoria, mas toda decisao de negocio vem de
  // um GET no recurso (provider.getPayment/getSubscription/getChargeback),
  // dentro de processWebhookEvent.
  const signatureValid = await provider.verifyWebhook({ headers: req.headers, query, rawBody })
  const event = provider.parseWebhook({ headers: req.headers, query, body: parsedBody })

  let row
  let isNew
  try {
    const recorded = await recordWebhookEvent(serviceClient, provider.name, event, parsedBody, signatureValid)
    row = recorded.row
    isNew = recorded.isNew
  } catch (err) {
    console.error('billing-webhook: falha ao gravar evento', err)
    return jsonResponse({ error: 'erro ao gravar evento' }, 500)
  }

  if (!signatureValid) {
    return jsonResponse({ error: 'assinatura inválida' }, 401)
  }

  if (!isNew) {
    // Evento repetido (reenvio do gateway) -- 200 sem reprocessar (Peca 3).
    return jsonResponse({ received: true, duplicate: true })
  }

  // Responde rápido (o MP espera ~22s) e processa depois. EdgeRuntime e um
  // global do runtime de Edge Functions do Supabase (Deno Deploy); se nao
  // existir (ex.: runtime local antigo), processa antes de responder --
  // funcionalmente equivalente em mock, so nao e "responde antes" literal.
  const run = () => processWebhookEvent(serviceClient, provider, row).catch((err) => {
    console.error('billing-webhook: falha ao processar evento', row.id, err)
  })

  // @ts-expect-error -- EdgeRuntime nao faz parte dos tipos padrao do Deno
  if (typeof EdgeRuntime !== 'undefined') {
    // @ts-expect-error -- idem
    EdgeRuntime.waitUntil(run())
  } else {
    await run()
  }

  return jsonResponse({ received: true })
})
