import { createClient } from 'npm:@supabase/supabase-js@2'

// Reenvia os dois emails de onboarding (link de criar senha + template
// Welcome Email do Resend) para um usuario ja cadastrado -- usado quando o
// primeiro envio falha ou atrasa (ex: MX do dominio ainda nao propagado).
// Nao cria nada novo, so gera um link de recovery fresco e reenvia.

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

function passwordEmailHtml(name: string, actionLink: string, intro: string): string {
  return `
    <div style="background:#0b1220;padding:40px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
      <div style="max-width:480px;margin:0 auto;background:#101a2c;border:1px solid #1e2a3f;border-radius:16px;overflow:hidden">
        <div style="padding:28px 32px 0 32px">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td>
                <img src="https://igolxkyahbavripvfeak.supabase.co/storage/v1/object/public/assets/ponderum_logo_branco_master_1.png" alt="Ponderum" width="88" height="23" style="display:block;border:0" />
              </td>
              <td align="right" style="font-size:13px;color:#6b7d99">
                <a href="mailto:contato@ponderum.com" style="color:#0670DB;text-decoration:underline">contato@ponderum.com</a>
              </td>
            </tr>
          </table>
        </div>
        <div style="padding:32px 32px 0 32px">
          <p style="margin:0;font-size:20px;line-height:28px;font-weight:700;color:#f4f6fa">Crie sua senha de acesso</p>
        </div>
        <div style="padding:20px 32px 0 32px">
          <p style="margin:0 0 18px;font-size:15px;line-height:24px;color:#cbd5e1">Olá, ${name},</p>
          <p style="margin:0 0 18px;font-size:15px;line-height:24px;color:#cbd5e1">${intro}</p>
          <p style="margin:0 0 18px;font-size:15px;line-height:24px">
            <a href="${actionLink}" style="color:#4ade80;text-decoration:none;font-weight:600">Criar minha senha →</a>
          </p>
          <p style="margin:0 0 24px;font-size:13px;line-height:20px;color:#6b7d99">Se você não esperava este email, pode ignorá-lo com segurança.</p>
        </div>
        <div style="padding:0 32px 28px 32px;border-top:1px solid #1e2a3f;padding-top:20px">
          <p style="margin:0;font-size:13px;line-height:20px;color:#6b7d99">Um abraço,<br/>Equipe Ponderum</p>
        </div>
      </div>
    </div>
  `
}

async function sendResendEmail(payload: Record<string, unknown>, resendKey: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
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

  // Mesma autoridade de quem pode cadastrar usuarios (Equipe Ponderum ou Menu Dev).
  const { data: caller, error: callerErr } = await userClient
    .from('users')
    .select('can_view_ponderum_team, can_view_dev')
    .maybeSingle()
  if (callerErr || !(caller?.can_view_ponderum_team || caller?.can_view_dev)) {
    return jsonResponse({ error: 'Acesso negado' }, 403)
  }

  let body: { email?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Corpo da requisição inválido' }, 400)
  }
  const email = body.email?.trim().toLowerCase()
  if (!email) return jsonResponse({ error: 'email é obrigatório' }, 400)

  const serviceClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: userRow, error: userErr } = await serviceClient
    .from('users')
    .select('name, social_name, staff_job_title, is_ponderum_staff')
    .eq('email', email)
    .maybeSingle()
  if (userErr || !userRow) {
    return jsonResponse({ error: 'Usuário não encontrado' }, 404)
  }
  const name = userRow.social_name || userRow.name || 'usuário(a)'

  const { data: linkData, error: linkErr } = await withRetry(() =>
    serviceClient.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${SITE_URL}/reset-password` },
    })
  )
  if (linkErr || !linkData) {
    console.error('admin-resend-onboarding-email generateLink failed:', JSON.stringify(linkErr))
    return jsonResponse({ error: 'Falhou ao gerar o link de acesso' }, 500)
  }
  const actionLink = linkData.properties.action_link

  const resendKey = Deno.env.get('RESEND_API_KEY') ?? ''
  if (!resendKey) return jsonResponse({ error: 'RESEND_API_KEY não configurada' }, 500)

  const intro = userRow.is_ponderum_staff
    ? `Você foi cadastrado(a) como ${userRow.staff_job_title || 'membro'} da equipe Ponderum. Clique no link abaixo para definir sua senha de acesso.`
    : 'Sua conta na Ponderum já foi criada. Clique no link abaixo para definir sua senha de acesso e começar a usar a plataforma.'
  const subject = userRow.is_ponderum_staff
    ? 'Bem-vindo à equipe Ponderum — crie sua senha de acesso'
    : 'Bem-vindo à Ponderum — crie sua senha de acesso'

  const [passwordEmailOk, welcomeEmailOk] = await Promise.all([
    sendResendEmail({
      from: 'Ponderum <acesso@ponderum.com>',
      to: [email],
      subject,
      html: passwordEmailHtml(name, actionLink, intro),
    }, resendKey),
    sendResendEmail({
      from: 'Ponderum <acesso@ponderum.com>',
      to: [email],
      template: { id: 'welcome-email', variables: { NOME: name } },
    }, resendKey),
  ])

  return jsonResponse({ success: true, passwordEmailOk, welcomeEmailOk })
})
