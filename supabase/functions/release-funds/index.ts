import { createClient } from 'npm:@supabase/supabase-js@2'

// Modulo de Pagamentos, Fase 5b -- marca released=true quando o dinheiro
// "cai" de verdade (spec Peca 9, secao 9: "release-funds | diario").

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

  const cronSecret = Deno.env.get('CRON_SECRET')
  if (req.headers.get('x-cron-secret') !== cronSecret) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const serviceClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data, error } = await serviceClient
    .from('payments')
    .update({ released: true, updated_at: new Date().toISOString() })
    .eq('status', 'approved')
    .eq('released', false)
    .lte('money_release_date', new Date().toISOString())
    .select('id')

  if (error) {
    console.error('release-funds: falha ao liberar pagamentos:', error)
    return jsonResponse({ error: 'erro ao liberar pagamentos' }, 500)
  }

  return jsonResponse({ released: data?.length ?? 0 })
})
