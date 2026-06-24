import { createClient } from 'npm:@supabase/supabase-js@2'
import Anthropic from 'npm:@anthropic-ai/sdk'

type ExtractedObligation = {
  description: string
  responsible: 'parte_a' | 'parte_b' | 'ambas'
  obligation_type: 'pagamento' | 'entrega' | 'notificacao' | 'renovacao' | 'reajuste' | 'outro'
  due_date: string | null
  recurrence: string | null
  value_cents: number | null
  penalty_text: string | null
}

const SYSTEM_PROMPT = `Você é um especialista em direito contratual brasileiro. Sua tarefa é identificar OBRIGAÇÕES CONTRATUAIS concretas no texto fornecido.

Uma obrigação contratual é algo que uma parte DEVE FAZER: pagar, entregar, notificar, renovar, reajustar, etc.

Retorne APENAS um JSON array válido com as obrigações encontradas. Máximo de 15 obrigações. Se não houver obrigações claras, retorne [].

Formato de cada obrigação:
{
  "description": "descrição clara e concisa da obrigação em linguagem simples",
  "responsible": "parte_a" | "parte_b" | "ambas",
  "obligation_type": "pagamento" | "entrega" | "notificacao" | "renovacao" | "reajuste" | "outro",
  "due_date": "YYYY-MM-DD" | null,
  "recurrence": "monthly" | "yearly" | "quarterly" | "a cada X meses" | null,
  "value_cents": 150000 | null,
  "penalty_text": "multa de X%" | null
}

Regras:
- parte_a = contratante/cliente, parte_b = contratado/prestador, ambas = ambas as partes
- due_date: data específica de vencimento. Se for recorrente, null
- value_cents: valor em centavos. R$ 1.500 = 150000
- Inclua apenas obrigações com consequências reais (multa, rescisão, perda de direito)
- NÃO inclua declarações gerais, apenas obrigações concretas`

export async function extractObligationsFromText(
  text: string,
  contractId: string,
  orgId: string,
  serviceClient: ReturnType<typeof createClient>
): Promise<{ count: number; error?: string }> {
  const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })

  const textSlice = text.slice(0, 12000)

  let obligations: ExtractedObligation[] = []
  try {
    const res = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Texto do contrato:\n\n${textSlice}\n\nIdentifique as obrigações contratuais e retorne o JSON array.`,
        },
      ],
    })

    const raw = res.content[0].type === 'text' ? res.content[0].text : ''
    const match = raw.match(/\[[\s\S]*\]/)
    if (match) {
      const parsed = JSON.parse(match[0])
      if (Array.isArray(parsed)) {
        obligations = parsed.slice(0, 15) as ExtractedObligation[]
      }
    }
  } catch (err) {
    return { count: 0, error: `Claude extraction failed: ${err}` }
  }

  if (obligations.length === 0) return { count: 0 }

  // Remove previous AI-extracted obligations for this contract
  await serviceClient
    .from('contract_obligations')
    .delete()
    .eq('contract_id', contractId)
    .eq('source', 'ai')

  const VALID_RESPONSIBLE = ['parte_a', 'parte_b', 'ambas']
  const VALID_TYPES = ['pagamento', 'entrega', 'notificacao', 'renovacao', 'reajuste', 'outro']

  const rows = obligations.map((o) => ({
    contract_id: contractId,
    org_id: orgId,
    description: o.description ?? '',
    responsible: VALID_RESPONSIBLE.includes(o.responsible) ? o.responsible : 'ambas',
    obligation_type: VALID_TYPES.includes(o.obligation_type) ? o.obligation_type : 'outro',
    due_date: o.due_date ?? null,
    recurrence: o.recurrence ?? null,
    value_cents: typeof o.value_cents === 'number' ? Math.round(o.value_cents) : null,
    penalty_text: o.penalty_text ?? null,
    status: 'pendente',
    source: 'ai',
  }))

  const { error } = await serviceClient.from('contract_obligations').insert(rows)
  if (error) return { count: 0, error: error.message }

  return { count: rows.length }
}
