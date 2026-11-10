import { createClient } from 'npm:@supabase/supabase-js@2'

// Modulo "Equipe" -- cria/revoga convite de usuario pra organizacao.
// Admin-only. O limite de usuarios por plano (1/3/5/10, billing_plans.
// features.max_users) e aplicado aqui -- mesmo numero usado no frontend
// (UsersTab.tsx) e revalidado de novo no aceite (handle_new_user trigger,
// migration 20261108010000_org_invites.sql), pra cobrir corrida entre
// convite criado e aceito.

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

// Mirrors billing_plans.features.max_users (supabase/migrations/
// 20261031000000_billing_plans.sql) -- Edge Function roda em runtime
// separado, nao pode importar de src/lib/pricing.ts.
const MAX_USERS: Record<string, number> = {
  freemium: 1,
  starter: 3,
  individual: 1,
  escritorio: 3,
  juridico: 5,
  corporativo: 10,
}

// Mesmo padrao de template Resend ja usado em dunning/index.ts e nas
// demais functions do Modulo de Pagamentos -- tenta enviar, pula
// silenciosamente se RESEND_API_KEY nao estiver configurado. O link
// copiavel (invite_url, devolvido sempre) continua sendo o caminho
// garantido mesmo se o e-mail nao chegar.
async function sendInviteEmail(to: string, orgName: string, invitedByName: string, inviteUrl: string): Promise<void> {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) return
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Ponderum <contato@ponderum.com>',
        to: [to],
        template: {
          id: 'convite-para-equipe',
          variables: { NOME_ORGANIZACAO: orgName, CONVIDADO_POR: invitedByName, LINK_CONVITE: inviteUrl },
        },
      }),
      signal: AbortSignal.timeout(8000),
    })
  } catch (err) {
    console.error('org-invite-user: falha ao enviar e-mail de convite:', err)
  }
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

  let body: { action?: 'create' | 'revoke'; email?: string; role?: string; invite_id?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'corpo inválido' }, 400)
  }

  const { data: authData } = await userClient.auth.getUser()
  if (!authData.user) return jsonResponse({ error: 'Não foi possível identificar sua organização.' }, 403)

  // Filtra por id explicitamente -- a policy de RLS (org_id = get_org_id())
  // sozinha devolve TODAS as linhas da organizacao do chamador, nao so a
  // dele, e quebra .maybeSingle() assim que a organizacao tem mais de 1
  // usuario (achado ao vivo testando o convite: organizacao com 2 usuarios
  // fazia essa busca falhar com "multiple rows returned").
  const { data: membership, error: membershipErr } = await userClient
    .from('users')
    .select('role, org_id, name, social_name')
    .eq('id', authData.user.id)
    .maybeSingle()
  if (membershipErr || !membership) return jsonResponse({ error: 'Não foi possível identificar sua organização.' }, 403)
  if (membership.role !== 'admin' && membership.role !== 'owner') {
    return jsonResponse({ error: 'Apenas administradores podem gerenciar convites.' }, 403)
  }

  const orgId = membership.org_id

  if (body.action === 'revoke') {
    if (!body.invite_id) return jsonResponse({ error: 'invite_id é obrigatório' }, 400)
    const { error } = await serviceClient
      .from('org_invites')
      .update({ status: 'revoked' })
      .eq('id', body.invite_id)
      .eq('organization_id', orgId)
      .eq('status', 'pending')
    if (error) return jsonResponse({ error: 'Erro ao cancelar convite.' }, 500)
    return jsonResponse({ success: true })
  }

  if (body.action !== 'create') return jsonResponse({ error: 'action deve ser create ou revoke' }, 400)

  const email = body.email?.trim().toLowerCase()
  if (!email || !email.includes('@')) return jsonResponse({ error: 'E-mail inválido' }, 400)
  const role = body.role === 'admin' ? 'admin' : 'member'

  const { data: org } = await serviceClient
    .from('organizations')
    .select('name, plan_id, plan_status')
    .eq('id', orgId)
    .single()
  const effectivePlanCode = org?.plan_status === 'active' ? (org.plan_id ?? 'starter') : 'freemium'
  const maxUsers = MAX_USERS[effectivePlanCode] ?? 1

  const [{ count: currentUsers }, { count: pendingInvites }] = await Promise.all([
    serviceClient.from('users').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
    serviceClient.from('org_invites').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'pending'),
  ])
  if ((currentUsers ?? 0) + (pendingInvites ?? 0) >= maxUsers) {
    return jsonResponse(
      { error: `Limite de ${maxUsers} usuário${maxUsers === 1 ? '' : 's'} do plano atingido. Faça upgrade para adicionar mais pessoas.` },
      400
    )
  }

  const { data: existingMember } = await serviceClient
    .from('users')
    .select('id')
    .eq('org_id', orgId)
    .ilike('email', email)
    .maybeSingle()
  if (existingMember) return jsonResponse({ error: 'Esse e-mail já faz parte da organização.' }, 400)

  const { data: existingInvite } = await serviceClient
    .from('org_invites')
    .select('id')
    .eq('organization_id', orgId)
    .eq('status', 'pending')
    .ilike('email', email)
    .maybeSingle()
  if (existingInvite) return jsonResponse({ error: 'Já existe um convite pendente para esse e-mail.' }, 400)

  const { data: invite, error: insertErr } = await serviceClient
    .from('org_invites')
    .insert({ organization_id: orgId, email, role, invited_by: authData.user?.id ?? null })
    .select('token')
    .single()
  if (insertErr || !invite) {
    console.error('org-invite-user: falha ao criar convite:', insertErr)
    return jsonResponse({ error: 'Erro ao criar convite.' }, 500)
  }

  const inviteUrl = `https://app.ponderum.com/login?invite=${invite.token}`
  await sendInviteEmail(email, org?.name ?? 'sua organização', membership.social_name || membership.name || 'Um administrador', inviteUrl)

  return jsonResponse({ success: true, invite_url: inviteUrl })
})
