import { createClient } from 'npm:@supabase/supabase-js@2'

// Modulo "Equipe" -- info publica de um convite (sem autenticacao: quem
// esta vendo ainda nao tem conta). Usado pela tela de cadastro quando
// chega com ?invite=<token>, pra pre-preencher o e-mail e mostrar o nome
// da organizacao antes de criar a conta.

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

  let body: { token?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ valid: false })
  }
  if (!body.token) return jsonResponse({ valid: false })

  const serviceClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: invite } = await serviceClient
    .from('org_invites')
    .select('email, organization_id, status, expires_at')
    .eq('token', body.token)
    .maybeSingle()

  if (!invite || invite.status !== 'pending' || new Date(invite.expires_at).getTime() < Date.now()) {
    return jsonResponse({ valid: false })
  }

  const { data: org } = await serviceClient
    .from('organizations')
    .select('name')
    .eq('id', invite.organization_id)
    .maybeSingle()

  return jsonResponse({ valid: true, email: invite.email, organization_name: org?.name ?? '' })
})
