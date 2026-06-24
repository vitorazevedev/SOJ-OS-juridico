import { createClient } from 'npm:@supabase/supabase-js@2'
import { extractObligationsFromText } from '../_shared/extract-obligations.ts'

// Extracts contractual obligations from a parsed contract using Claude Haiku.
// Called automatically by parse-contract; also available standalone for re-extraction.

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

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return jsonResponse({ error: 'Unauthorized' }, 401)

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const serviceClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  let contract_id: string
  try {
    ;({ contract_id } = await req.json())
    if (!contract_id) throw new Error('missing contract_id')
  } catch {
    return jsonResponse({ error: 'contract_id is required' }, 400)
  }

  // Auth check — RLS ensures caller owns this contract
  const { data: contract, error: contractErr } = await userClient
    .from('contracts')
    .select('id, org_id')
    .eq('id', contract_id)
    .single()

  if (contractErr || !contract) {
    return jsonResponse({ error: 'Contract not found' }, 404)
  }

  const { data: content } = await serviceClient
    .from('contract_contents')
    .select('raw_text')
    .eq('contract_id', contract_id)
    .maybeSingle()

  if (!content?.raw_text) {
    return jsonResponse(
      { error: 'Contract text not available. Parse the contract first.' },
      400
    )
  }

  const result = await extractObligationsFromText(
    content.raw_text,
    contract_id,
    contract.org_id,
    serviceClient
  )

  if (result.error) {
    return jsonResponse({ success: false, error: result.error }, 500)
  }

  return jsonResponse({ success: true, obligations_extracted: result.count })
})
