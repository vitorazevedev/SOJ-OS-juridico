import { createClient } from 'npm:@supabase/supabase-js@2'
import Anthropic from 'npm:@anthropic-ai/sdk'
import { extractObligationsFromText } from '../_shared/extract-obligations.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 8192
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
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

  // User client — RLS validates that the contract belongs to the caller's org
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  // Service client — used only for storage download and DB writes after auth
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

  // Auth check via RLS — only succeeds if caller owns this contract
  const { data: contract, error: contractErr } = await userClient
    .from('contracts')
    .select('id, file_path, file_type, file_name')
    .eq('id', contract_id)
    .single()

  if (contractErr || !contract?.file_path) {
    return jsonResponse({ error: 'Contract not found' }, 404)
  }

  // Download the file
  const { data: blob, error: dlErr } = await serviceClient.storage
    .from('contracts')
    .download(contract.file_path)

  if (dlErr || !blob) {
    return jsonResponse({ error: `Storage download failed: ${dlErr?.message}` }, 500)
  }

  const arrayBuffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)
  const filePath = (contract.file_path ?? '').toLowerCase()
  const mimeType = (contract.file_type ?? '').toLowerCase()

  const isPDF = mimeType.includes('pdf') || filePath.endsWith('.pdf')
  const isDOCX =
    mimeType.includes('wordprocessingml') ||
    mimeType.includes('docx') ||
    filePath.endsWith('.docx')
  const isImage =
    mimeType.startsWith('image/') ||
    /\.(jpg|jpeg|png)$/.test(filePath)

  const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })
  let rawText = ''
  let ocrApplied = false

  try {
    if (isPDF) {
      const base64 = toBase64(bytes)
      const res = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 8192,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: { type: 'base64', media_type: 'application/pdf', data: base64 },
              },
              {
                type: 'text',
                text: 'Extract the complete text from this document. Preserve paragraph structure with line breaks. Return only the raw text, no commentary.',
              },
            ],
          },
        ],
      })
      rawText = res.content[0].type === 'text' ? res.content[0].text : ''
    } else if (isDOCX) {
      // @ts-expect-error — mammoth works via npm compat layer in Deno
      const mammoth = (await import('npm:mammoth')).default
      const result = await mammoth.extractRawText({ arrayBuffer })
      rawText = result.value ?? ''
    } else if (isImage) {
      ocrApplied = true
      const base64 = toBase64(bytes)
      const imageMediaType: 'image/jpeg' | 'image/png' =
        mimeType === 'image/png' ? 'image/png' : 'image/jpeg'
      const res = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 8192,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: imageMediaType, data: base64 } },
              {
                type: 'text',
                text: 'Extract all visible text from this scanned document image. Preserve structure with line breaks. Return only the extracted text.',
              },
            ],
          },
        ],
      })
      rawText = res.content[0].type === 'text' ? res.content[0].text : ''
    } else {
      return jsonResponse({ error: `Unsupported file type: ${mimeType}. Use PDF, DOCX, JPG or PNG.` }, 400)
    }

    if (!rawText.trim()) {
      throw new Error('No text could be extracted from this document.')
    }

    // Extract structured metadata from contract text
    const metaRes = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Analise este trecho de contrato brasileiro e retorne APENAS JSON válido, sem explicações:

${rawText.slice(0, 3500)}

Retorne exatamente neste formato:
{
  "counterparty": "nome da contraparte principal ou null",
  "parties": ["parte 1", "parte 2"],
  "type_label": "tipo do contrato em português (ex: Prestação de Serviços, NDA, SaaS, Parceria Comercial, Fornecimento, Contrato de Trabalho, Locação, Compra e Venda, Outro)",
  "signing_date": "YYYY-MM-DD ou null",
  "start_date": "YYYY-MM-DD ou null",
  "end_date": "YYYY-MM-DD ou null",
  "term_description": "ex: 12 meses ou null",
  "contract_value_brl": 150000.00 ou null,
  "penalty_description": "descrição de multas/penalidades ou null",
  "key_clauses": ["cláusula 1", "cláusula 2"]
}`,
        },
      ],
    })

    let counterparty: string | null = null
    let typeLabel: string | null = null
    let parsedData: Record<string, unknown> = {}
    try {
      const metaText = metaRes.content[0].type === 'text' ? metaRes.content[0].text : ''
      const match = metaText.match(/\{[\s\S]*\}/)
      if (match) {
        const meta = JSON.parse(match[0])
        counterparty = meta.counterparty || null
        typeLabel = meta.type_label || null
        parsedData = {
          parties: meta.parties || [],
          signing_date: meta.signing_date || null,
          start_date: meta.start_date || null,
          end_date: meta.end_date || null,
          term_description: meta.term_description || null,
          contract_value_brl: meta.contract_value_brl || null,
          penalty_description: meta.penalty_description || null,
          key_clauses: meta.key_clauses || [],
        }
      }
    } catch {
      // fallback to empty — not critical
    }

    const wordCount = rawText.split(/\s+/).filter(Boolean).length

    // Persist parsed content
    const { data: existing } = await serviceClient
      .from('contract_contents')
      .select('id')
      .eq('contract_id', contract_id)
      .maybeSingle()

    if (existing) {
      await serviceClient
        .from('contract_contents')
        .update({ raw_text: rawText, word_count: wordCount, ocr_applied: ocrApplied, parsed_at: new Date().toISOString() })
        .eq('contract_id', contract_id)
    } else {
      await serviceClient
        .from('contract_contents')
        .insert({ contract_id, raw_text: rawText, word_count: wordCount, ocr_applied: ocrApplied, parsed_at: new Date().toISOString() })
    }

    // Update contract record — status → em_analise, fill extracted fields
    await serviceClient
      .from('contracts')
      .update({
        party: counterparty,
        type: typeLabel,
        parsed_data: parsedData,
        status: 'em_analise',
        updated_at: new Date().toISOString(),
      })
      .eq('id', contract_id)

    // Extract obligations in background — best effort, doesn't block the response
    const { data: contractRow } = await serviceClient
      .from('contracts')
      .select('org_id')
      .eq('id', contract_id)
      .single()
    if (contractRow?.org_id) {
      extractObligationsFromText(rawText, contract_id, contractRow.org_id, serviceClient).catch(
        (e) => console.error('extract-obligations error:', e)
      )
    }

    return jsonResponse({ success: true, word_count: wordCount })
  } catch (err) {
    console.error('parse-contract error:', err)
    // Revert status so user can retry
    await serviceClient
      .from('contracts')
      .update({ status: 'aguardando', updated_at: new Date().toISOString() })
      .eq('id', contract_id)
    return jsonResponse({ error: String(err) }, 500)
  }
})
