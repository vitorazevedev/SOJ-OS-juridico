import { createClient } from 'npm:@supabase/supabase-js@2'

// Dispara o email "nota-fiscal" (template do Resend) pro admin da
// organizacao sempre que a Equipe Ponderum anexa uma nota fiscal (painel
// Equipe Ponderum > Organizacoes > Upload NF). O upload do arquivo e a
// insercao em public.invoices ja aconteceram antes de chamar esta funcao
// (upload direto do cliente pro storage + RPC staff_create_invoice) --
// aqui so busca os dados salvos e dispara o email.

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

// Link do botão "Baixar nota fiscal" precisa apontar direto pro arquivo (não
// pro app) -- URL assinada de validade longa em vez de curta, já que o link
// fica parado numa caixa de email e pode ser clicado bem depois do envio.
const SIGNED_URL_EXPIRY_SECONDS = 60 * 60 * 24 * 365 * 5 // 5 anos

function fmtBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
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

  const { data: caller, error: callerErr } = await userClient
    .from('users')
    .select('can_view_ponderum_team')
    .maybeSingle()
  if (callerErr || !caller?.can_view_ponderum_team) {
    return jsonResponse({ error: 'Acesso negado' }, 403)
  }

  let body: { invoice_id?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Corpo da requisição inválido' }, 400)
  }
  const invoiceId = body.invoice_id
  if (!invoiceId) return jsonResponse({ error: 'invoice_id é obrigatório' }, 400)

  const serviceClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: invoice, error: invErr } = await serviceClient
    .from('invoices')
    .select('org_id, numero_nota, valor_cents, data_emissao, file_path')
    .eq('id', invoiceId)
    .single()
  if (invErr || !invoice) {
    return jsonResponse({ error: 'Nota fiscal não encontrada' }, 404)
  }

  const { data: signedUrlData, error: signErr } = await serviceClient.storage
    .from('contracts')
    .createSignedUrl(invoice.file_path, SIGNED_URL_EXPIRY_SECONDS)
  if (signErr || !signedUrlData) {
    return jsonResponse({ error: 'Falha ao gerar o link de download da nota fiscal' }, 500)
  }

  const { data: admin } = await serviceClient
    .from('users')
    .select('name, social_name, email')
    .eq('org_id', invoice.org_id)
    .eq('role', 'admin')
    .maybeSingle()

  if (!admin?.email) {
    return jsonResponse({ error: 'Administrador da organização não encontrado' }, 404)
  }

  const resendKey = Deno.env.get('RESEND_API_KEY') ?? ''
  if (!resendKey) return jsonResponse({ error: 'RESEND_API_KEY não configurada' }, 500)

  const name = admin.social_name || admin.name || 'usuário(a)'

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Ponderum <contato@ponderum.com>',
        to: [admin.email],
        template: {
          id: 'nota-fiscal',
          variables: {
            NOME: name,
            NUMERO_NOTA: invoice.numero_nota,
            VALOR: fmtBRL(invoice.valor_cents),
            DATA_EMISSAO: fmtDate(invoice.data_emissao),
            LINK_NOTA: signedUrlData.signedUrl,
          },
        },
      }),
      signal: AbortSignal.timeout(8000),
    })
    return jsonResponse({ success: true, emailSent: res.ok })
  } catch (err) {
    console.error('admin-send-invoice-email error:', err)
    return jsonResponse({ success: true, emailSent: false })
  }
})
