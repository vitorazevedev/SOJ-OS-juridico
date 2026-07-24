import { createClient } from 'npm:@supabase/supabase-js@2'

// Usado pelo painel "Equipe Ponderum" para cadastrar manualmente um cliente do
// Plano Starter que ainda nao tem conta (venda fechada pelo WhatsApp, atendente
// confirma o pagamento e cria o acesso aqui). Cria organizacao + usuario admin
// sem senha, e devolve um link de definicao de senha (Admin API, nunca exposto
// ao navegador do atendente com a service role key) para copiar/enviar por
// WhatsApp e, opcionalmente, envia por email com a marca da Ponderum.

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

// AuthRetryableFetchError é a própria nomenclatura do supabase-js pra erro de
// rede/transporte entre a Edge Function e o servidor de autenticação (não é
// erro de dado) — o SDK já sinaliza que vale tentar de novo.
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

async function sendOnboardingEmail(to: string, name: string, actionLink: string, resendKey: string): Promise<boolean> {
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
        subject: 'Bem-vindo à Ponderum — crie sua senha de acesso',
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
            <div style="background:#111;padding:16px 24px;border-radius:8px 8px 0 0">
              <span style="color:#00e5a0;font-weight:700;font-size:18px">Ponderum</span>
              <span style="color:#888;font-size:12px;margin-left:8px">Inteligência contratual</span>
            </div>
            <div style="border:1px solid #222;border-top:none;padding:24px;border-radius:0 0 8px 8px">
              <h2 style="margin:0 0 16px;font-size:16px;color:#111">Olá, ${name}!</h2>
              <p style="font-size:13.5px;color:#555;line-height:1.6;margin:0 0 20px">
                Sua conta na Ponderum já foi criada. Clique no botão abaixo para definir sua senha de acesso e começar a usar a plataforma.
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

  // Só quem tem acesso ao menu "Equipe Ponderum" (can_view_ponderum_team)
  // pode chamar esta função — checado de novo aqui porque o service role
  // abaixo ignora RLS por completo.
  const { data: caller, error: callerErr } = await userClient
    .from('users')
    .select('can_view_ponderum_team')
    .maybeSingle()
  if (callerErr || !caller?.can_view_ponderum_team) {
    return jsonResponse({ error: 'Acesso negado' }, 403)
  }

  let body: {
    name?: string; socialName?: string | null; orgName?: string; ddi?: string; phone?: string;
    cnpj?: string; email?: string; sendEmail?: boolean;
  }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Corpo da requisição inválido' }, 400)
  }

  const name = body.name?.trim()
  const socialName = body.socialName?.trim() || null
  const orgName = body.orgName?.trim()
  const email = body.email?.trim().toLowerCase()
  const phone = `${body.ddi?.trim() ?? ''} ${body.phone?.trim() ?? ''}`.trim()
  const cnpj = body.cnpj?.trim() || null
  const sendEmail = body.sendEmail !== false

  if (!name || !orgName || !email || !body.phone?.trim() || !cnpj) {
    return jsonResponse({ error: 'Campos obrigatórios faltando' }, 400)
  }

  const serviceClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    // 1. Cria o usuário sem senha — o gatilho on_auth_user_created (mesmo da
    // tela de cadastro pública) cria a organização e a linha em public.users
    // automaticamente a partir do user_metadata.
    const { data: created, error: createErr } = await withRetry(() =>
      serviceClient.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { name, social_name: socialName, org_name: orgName, phone, cnpj },
      })
    )
    if (createErr || !created.user) {
      console.error('admin-create-user createUser failed:', JSON.stringify(createErr), createErr?.message, createErr?.status)
      const rawMsg = createErr?.message
      // Temporário, pra debugar a instabilidade de JWT/rede sem precisar abrir
      // os Logs no painel toda vez — mostra nome+status do erro real quando a
      // mensagem em si não é útil (ex.: "{}").
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
      // Sinaliza pro cliente que vale tentar de novo (instabilidade de rede/JWT
      // do lado do Supabase, já esgotamos as tentativas automáticas aqui
      // dentro) — mais confiável que o cliente adivinhar isso pelo texto.
      return jsonResponse({ error: friendly, retryable: isRetryable(createErr) }, 400)
    }
    const userId = created.user.id

    // 2. Cadastro manual pelo atendente = venda já confirmada, então o plano
    // entra ativo direto (o gatilho cria como 'starter'/'trial' por padrão,
    // usado no autocadastro).
    const { data: userRow } = await serviceClient
      .from('users')
      .select('org_id')
      .eq('id', userId)
      .single()
    const orgId = userRow?.org_id
    if (orgId) {
      await serviceClient.from('organizations').update({ plan_status: 'active' }).eq('id', orgId)
    }

    // 3. Link de definição de senha (Admin API — nunca enviado ao navegador
    // com a service role, só o link resultante).
    const { data: linkData, error: linkErr } = await withRetry(() =>
      serviceClient.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo: `${SITE_URL}/reset-password` },
      })
    )
    if (linkErr || !linkData) {
      console.error('admin-create-user generateLink failed:', JSON.stringify(linkErr))
      return jsonResponse({ error: 'Usuário criado, mas falhou ao gerar o link de acesso' }, 500)
    }
    const actionLink = linkData.properties.action_link

    let emailSent = false
    if (sendEmail) {
      const resendKey = Deno.env.get('RESEND_API_KEY') ?? ''
      if (resendKey) emailSent = await sendOnboardingEmail(email, name, actionLink, resendKey)
    }

    return jsonResponse({ success: true, userId, orgId, actionLink, emailSent })
  } catch (err) {
    console.error('admin-create-user error:', err)
    const message = err instanceof Error ? err.message : JSON.stringify(err)
    return jsonResponse({ error: message }, 500)
  }
})
