import { createClient } from 'npm:@supabase/supabase-js@2'

// Reset de MFA pra staff que perdeu o dispositivo autenticador -- o
// Supabase TOTP MFA nao tem codigo de recuperacao embutido, entao a unica
// saida e alguem com privilegio remover o fator via Admin API (o proprio
// staff cai de aal2 pra aal1 e e obrigado a reenrolar no proximo login).
// Gate por 'dev' (nao 'owner') porque ninguem tem 'owner' ainda -- mesmo
// padrao ja usado em admin-create-staff-member (Fase 1 do Manager).

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

  const { data: authData } = await userClient.auth.getUser()
  if (!authData.user) return jsonResponse({ error: 'Acesso negado' }, 403)

  const { data: callerIsDev, error: callerErr } = await userClient.rpc('has_staff_role', { p_role: 'dev' })
  if (callerErr || !callerIsDev) {
    return jsonResponse({ error: 'Acesso negado' }, 403)
  }

  let body: { targetUserId?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Corpo da requisição inválido' }, 400)
  }
  const targetUserId = body.targetUserId?.trim()
  if (!targetUserId) return jsonResponse({ error: 'targetUserId é obrigatório' }, 400)

  const serviceClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: factorsData, error: listErr } = await serviceClient.auth.admin.mfa.listFactors({ userId: targetUserId })
  if (listErr) {
    console.error('admin-reset-staff-mfa listFactors failed:', JSON.stringify(listErr))
    return jsonResponse({ error: 'Falhou ao consultar os fatores de MFA' }, 500)
  }

  const factors = factorsData?.factors ?? []
  for (const factor of factors) {
    const { error: deleteErr } = await serviceClient.auth.admin.mfa.deleteFactor({ id: factor.id, userId: targetUserId })
    if (deleteErr) {
      console.error('admin-reset-staff-mfa deleteFactor failed:', JSON.stringify(deleteErr))
      return jsonResponse({ error: 'Falhou ao remover um dos fatores de MFA' }, 500)
    }
  }

  await userClient.rpc('log_staff_action', {
    p_action: 'reset_staff_mfa',
    p_target_type: 'user',
    p_target_id: targetUserId,
    p_metadata: { factors_removed: factors.length },
  })

  return jsonResponse({ success: true, factorsRemoved: factors.length })
})
