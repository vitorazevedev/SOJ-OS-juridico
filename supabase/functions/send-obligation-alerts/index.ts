import { createClient } from 'npm:@supabase/supabase-js@2'

// Cron job: runs daily at 07:00 BRT (10:00 UTC) on weekdays.
// 1. Marks overdue obligations (due_date < today, status = 'pendente').
// 2. Sends email alerts at 30, 15, 7, and 0 days before due date.
//    Email delivery requires RESEND_API_KEY secret — gracefully skipped if absent.

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

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  resendKey: string
): Promise<boolean> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Ponderum <alertas@ponderum.com>',
        to: [to],
        subject,
        html,
      }),
      signal: AbortSignal.timeout(8000),
    })
    return res.ok
  } catch {
    return false
  }
}

function buildAlertEmail(
  obligationDesc: string,
  contractName: string,
  dueDate: string,
  daysLeft: number
): { subject: string; html: string } {
  const urgencyLabel =
    daysLeft === 0 ? 'VENCE HOJE' :
    daysLeft === 1 ? 'vence AMANHÃ' :
    `vence em ${daysLeft} dias`

  const subject = `[Ponderum] Obrigação ${urgencyLabel} — ${contractName}`
  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
      <div style="background:#111;padding:16px 24px;border-radius:8px 8px 0 0">
        <span style="color:#00e5a0;font-weight:700;font-size:18px">Ponderum</span>
        <span style="color:#888;font-size:12px;margin-left:8px">Inteligência contratual</span>
      </div>
      <div style="border:1px solid #222;border-top:none;padding:24px;border-radius:0 0 8px 8px">
        <h2 style="margin:0 0 16px;font-size:16px;color:#111">
          Obrigação contratual ${urgencyLabel}
        </h2>
        <div style="background:#fafafa;border-left:4px solid ${daysLeft <= 1 ? '#ef4444' : daysLeft <= 7 ? '#f97316' : '#eab308'};padding:12px 16px;border-radius:4px;margin-bottom:16px">
          <p style="margin:0 0 4px;font-weight:600;color:#111">${obligationDesc}</p>
          <p style="margin:0;font-size:13px;color:#555">Contrato: ${contractName}</p>
          <p style="margin:4px 0 0;font-size:13px;color:#555">Vencimento: ${new Date(dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
        </div>
        <p style="font-size:13px;color:#555;margin:0">
          Acesse o Ponderum para marcar esta obrigação como cumprida ou verificar os detalhes.
        </p>
        <div style="margin-top:16px;padding-top:16px;border-top:1px solid #eee">
          <p style="font-size:11px;color:#999;margin:0">
            Este alerta foi enviado automaticamente pelo Ponderum. Não responda este email.
          </p>
        </div>
      </div>
    </div>
  `
  return { subject, html }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const serviceClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const resendKey = Deno.env.get('RESEND_API_KEY') ?? ''
  const emailEnabled = resendKey.length > 0

  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const todayStr = toDateStr(today)

  const results = {
    overdue_marked: 0,
    alerts_sent: 0,
    emails_sent: 0,
    emails_skipped: 0,
    errors: [] as string[],
  }

  // 1. Mark overdue: due_date < today AND status = 'pendente'
  const { count: overdueCount, error: overdueErr } = await serviceClient
    .from('contract_obligations')
    .update({ status: 'atrasada' })
    .lt('due_date', todayStr)
    .eq('status', 'pendente')
    .select('id', { count: 'exact', head: true })

  if (overdueErr) {
    results.errors.push(`overdue update: ${overdueErr.message}`)
  } else {
    results.overdue_marked = overdueCount ?? 0
  }

  // 2. Find obligations needing alerts
  // We check dates at: today+30, today+15, today+7, today+0
  const alertWindows = [
    { days: 30, col: 'alert_sent_30' as const },
    { days: 15, col: 'alert_sent_15' as const },
    { days: 7, col: 'alert_sent_7' as const },
    { days: 0, col: 'alert_sent_1' as const },
  ]

  for (const window of alertWindows) {
    const targetDate = toDateStr(addDays(today, window.days))

    const { data: obligations, error: fetchErr } = await serviceClient
      .from('contract_obligations')
      .select('id, description, contract_id, org_id, due_date, ' + window.col)
      .eq('due_date', targetDate)
      .eq(window.col, false)
      .eq('status', 'pendente')

    if (fetchErr) {
      results.errors.push(`fetch for ${window.days}d: ${fetchErr.message}`)
      continue
    }

    if (!obligations || obligations.length === 0) continue

    for (const ob of obligations) {
      results.alerts_sent++

      // Mark alert as sent
      await serviceClient
        .from('contract_obligations')
        .update({ [window.col]: true })
        .eq('id', ob.id)

      if (!emailEnabled) {
        results.emails_skipped++
        console.log(
          `[alert-dry-run] ${window.days}d: obligation=${ob.id} contract=${ob.contract_id}`
        )
        continue
      }

      // Get contract name and user email
      const { data: contractRow } = await serviceClient
        .from('contracts')
        .select('name, org_id')
        .eq('id', ob.contract_id)
        .single()

      const { data: userRows } = await serviceClient
        .from('users')
        .select('email')
        .eq('org_id', ob.org_id)
        .limit(5)

      const emails = (userRows ?? []).map((u: { email: string }) => u.email).filter(Boolean)
      const contractName = contractRow?.name ?? 'Contrato'

      const { subject, html } = buildAlertEmail(
        ob.description,
        contractName,
        ob.due_date,
        window.days
      )

      for (const email of emails) {
        const sent = await sendEmail(email, subject, html, resendKey)
        if (sent) results.emails_sent++
        else results.errors.push(`email failed for ${email}`)
      }
    }
  }

  return jsonResponse({
    success: true,
    timestamp: new Date().toISOString(),
    email_enabled: emailEnabled,
    ...results,
  })
})
