import { createClient } from 'npm:@supabase/supabase-js@2'

// Fetches SELIC, IPCA and INPC from public BCB/IBGE APIs.
// Intended to be called via a Supabase cron job daily at 08:00 BRT,
// or manually triggered via HTTP POST (no JWT required for internal use).

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

async function fetchSelic(): Promise<{ value: number; period: string } | null> {
  try {
    // BCB series 432 — Meta SELIC definida pelo COPOM (% a.a.)
    const res = await fetch(
      'https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json',
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return null
    const data = await res.json() as { data: string; valor: string }[]
    if (!data?.[0]) return null
    const value = parseFloat(data[0].valor)
    const [, month, year] = data[0].data.split('/')
    return { value, period: `${year}-${month}` }
  } catch {
    return null
  }
}

async function fetchIpca(): Promise<{ value: number; period: string } | null> {
  try {
    // BCB series 13522 — IPCA acumulado 12 meses (%)
    const res = await fetch(
      'https://api.bcb.gov.br/dados/serie/bcdata.sgs.13522/dados/ultimos/1?formato=json',
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return null
    const data = await res.json() as { data: string; valor: string }[]
    if (!data?.[0]) return null
    const value = parseFloat(data[0].valor)
    const [, month, year] = data[0].data.split('/')
    return { value, period: `${year}-${month}` }
  } catch {
    return null
  }
}

async function fetchInpc(): Promise<{ value: number; period: string } | null> {
  try {
    // BCB series 188 — INPC acumulado 12 meses (%)
    const res = await fetch(
      'https://api.bcb.gov.br/dados/serie/bcdata.sgs.188/dados/ultimos/1?formato=json',
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return null
    const data = await res.json() as { data: string; valor: string }[]
    if (!data?.[0]) return null
    const value = parseFloat(data[0].valor)
    const [, month, year] = data[0].data.split('/')
    return { value, period: `${year}-${month}` }
  } catch {
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const serviceClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const [selic, ipca, inpc] = await Promise.all([fetchSelic(), fetchIpca(), fetchInpc()])

  const updates: { name: string; value: number; period: string; fetched_at: string }[] = []
  const now = new Date().toISOString()

  if (selic) updates.push({ name: 'selic', value: selic.value, period: selic.period, fetched_at: now })
  if (ipca) updates.push({ name: 'ipca_12m', value: ipca.value, period: ipca.period, fetched_at: now })
  if (inpc) updates.push({ name: 'inpc_12m', value: inpc.value, period: inpc.period, fetched_at: now })

  const results: Record<string, unknown> = {}
  for (const update of updates) {
    const { error } = await serviceClient
      .from('economic_indexes')
      .upsert(update, { onConflict: 'name' })
    results[update.name] = error ? `error: ${error.message}` : update.value
  }

  return jsonResponse({
    success: true,
    updated: results,
    skipped: [
      ...(!selic ? ['selic'] : []),
      ...(!ipca ? ['ipca_12m'] : []),
      ...(!inpc ? ['inpc_12m'] : []),
    ],
    timestamp: now,
  })
})
