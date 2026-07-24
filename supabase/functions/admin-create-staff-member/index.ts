import { createClient } from 'npm:@supabase/supabase-js@2'

// Usado pela area de gestao da Equipe Ponderum (dentro do Menu Dev) para
// cadastrar um novo membro interno com login proprio. Cria uma
// organizacao interna dedicada (mesmo gatilho on_auth_user_created do
// cadastro publico) e, na sequencia, marca o usuario como membro da
// equipe com as permissoes granulares escolhidas na criacao. Devolve um
// link de definicao de senha (Admin API) pra copiar/enviar e,
// opcionalmente, envia por email com a marca da Ponderum.

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

function isRetryable(error: { name?: string; status?: number } | null): boolean {
  if (!error) return false
  return error.name === 'AuthRetryableFetchError' || error.status === 500
}

async function withRetry<T>(
  fn: () => Promise<{ data: T; error: { name?: string; status?: number; message?: string } | null }>,
  attempts = 4
) {
  let result = await fn()
  for (let i = 1; i < attempts && isRetryable(result.error); i++) {
    await new Promise((r) => setTimeout(r, 400 * i))
    result = await fn()
  }
  return result
}

const SITE_URL = 'https://app.ponderum.com'

async function sendOnboardingEmail(to: string, name: string, jobTitle: string, actionLink: string, resendKey: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Ponderum <acesso@ponderum.com>',
        to: [to],
        subject: 'Bem-vindo à equipe Ponderum — crie sua senha de acesso',
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
            <div style="background:#111;padding:16px 24px;border-radius:8px 8px 0 0">
              <span style="color:#00e5a0;font-weight:700;font-size:18px">Ponderum</span>
              <span style="color:#888;font-size:12px;margin-left:8px">Equipe interna</span>
            </div>
            <div style="border:1px solid #222;border-top:none;padding:24px;border-radius:0 0 8px 8px">
              <h2 style="margin:0 0 16px;font-size:16px;color:#111">Olá, ${name}!</h2>
              <p style="font-size:13.5px;color:#555;line-height:1.6;margin:0 0 20px">
                Você foi cadastrado(a) como ${jobTitle || "membro"} da equipe Ponderum. Clique no botão abaixo para definir sua senha de acesso.
              </p>
              <a href="${actionLink}" style="display:inline-block;background:#067173;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px">
                Criar minha senha
              </a>
              <p style="font-size:11px;color:#999;margin:20px 0 0">
                Se você não esperava este email, pode ignorá-lo com segurança.
              </p>
            </div>
          </div>
        `,
      }),
      signal: AbortSignal.timeout(8000),
    })
    return res.ok
  } catch {
    return false
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

  // Gestao de membros da equipe fica dentro do Menu Dev — exige
  // can_view_dev, checado de novo aqui porque o service role abaixo
  // ignora RLS por completo.
  const { data: caller, error: callerErr } = await userClient
    .from('users')
    .select('can_view_dev')
    .maybeSingle()
  if (callerErr || !caller?.can_view_dev) {
    return jsonResponse({ error: 'Acesso negado' }, 403)
  }

  let body: {
    name?: string; jobTitle?: string; ddi?: string; phone?: string; email?: string;
    cnpj?: string | null;
    canViewDev?: boolean; canViewPonderumTeam?: boolean; fullPlatformAccess?: boolean;
    sendEmail?: boolean;
  }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Corpo da requisição inválido' }, 400)
  }

  const name = body.name?.trim()
  const jobTitle = body.jobTitle?.trim() ?? ''
  const email = body.email?.trim().toLowerCase()
  const phone = body.phone?.trim() ? `${body.ddi?.trim() ?? ''} ${body.phone.trim()}`.trim() : null
  const cnpj = body.cnpj?.trim() || null
  const canViewDevPerm = body.canViewDev === true
  const canViewPonderumTeamPerm = body.canViewPonderumTeam === true
  const fullPlatformAccessPerm = body.fullPlatformAccess === true
  const sendEmail = body.sendEmail !== false

  if (!name || !jobTitle || !email) {
    return jsonResponse({ error: 'Campos obrigatórios faltando' }, 400)
  }
  if (!canViewDevPerm && !canViewPonderumTeamPerm && !fullPlatformAccessPerm) {
    return jsonResponse({ error: 'Selecione ao menos uma permissão' }, 400)
  }

  const serviceClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    // 1. Cria o usuário sem senha — mesmo gatilho on_auth_user_created do
    // cadastro público, gera uma organização interna dedicada pra esse
    // membro (nao e cliente, so satisfaz a FK obrigatoria org_id).
    const { data: created, error: createErr } = await withRetry(() =>
      serviceClient.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          name, org_name: `Ponderum · ${name}`, phone, cnpj, terms_accepted: true,
        },
      })
    )
    if (createErr || !created.user) {
      console.error('admin-create-staff-member createUser failed:', JSON.stringify(createErr))
      const rawMsg = createErr?.message
      const msg = rawMsg && rawMsg.trim() && rawMsg.trim() !== '{}'
        ? rawMsg
        : `Erro ao criar usuário (${createErr?.name ?? 'desconhecido'}, status ${createErr?.status ?? '?'}). Tente novamente.`
      const lower = msg.toLowerCase()
      const docDigits = cnpj?.replace(/\D/g, '') ?? ''
      const docLabel = docDigits.length === 11 ? 'CPF' : 'CNPJ'
      let friendly = msg
      if (lower.includes('already been registered') || lower.includes('already registered')) {
        friendly = 'Email já cadastrado'
      } else if (lower.includes('organizations_cnpj_unique') || lower.includes('cnpj')) {
        friendly = `${docLabel} já cadastrado`
      }
      return jsonResponse({ error: friendly, retryable: isRetryable(createErr) }, 400)
    }
    const userId = created.user.id

    // 2. Marca como membro da equipe Ponderum com as permissoes escolhidas.
    // terms_accepted_at ja fica preenchido (via metadata terms_accepted
    // acima) -- membro interno nao precisa aceitar Termos/Privacidade
    // como um cliente.
    const { error: updateErr } = await serviceClient
      .from('users')
      .update({
        is_ponderum_staff: true,
        staff_job_title: jobTitle,
        can_view_dev: canViewDevPerm,
        can_view_ponderum_team: canViewPonderumTeamPerm,
        full_platform_access: fullPlatformAccessPerm,
      })
      .eq('id', userId)
    if (updateErr) {
      console.error('admin-create-staff-member update failed:', JSON.stringify(updateErr))
      return jsonResponse({ error: 'Usuário criado, mas falhou ao definir permissões' }, 500)
    }

    // 3. Link de definição de senha.
    const { data: linkData, error: linkErr } = await withRetry(() =>
      serviceClient.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo: `${SITE_URL}/reset-password` },
      })
    )
    if (linkErr || !linkData) {
      console.error('admin-create-staff-member generateLink failed:', JSON.stringify(linkErr))
      return jsonResponse({ error: 'Usuário criado, mas falhou ao gerar o link de acesso' }, 500)
    }
    const actionLink = linkData.properties.action_link

    let emailSent = false
    if (sendEmail) {
      const resendKey = Deno.env.get('RESEND_API_KEY') ?? ''
      if (resendKey) emailSent = await sendOnboardingEmail(email, name, jobTitle, actionLink, resendKey)
    }

    return jsonResponse({ success: true, userId, actionLink, emailSent })
  } catch (err) {
    console.error('admin-create-staff-member error:', err)
    const message = err instanceof Error ? err.message : JSON.stringify(err)
    return jsonResponse({ error: message }, 500)
  }
})
