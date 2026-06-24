---
id: STORY-002
title: Upload e Parsing de Contratos
status: InProgress
type: Feature
priority: Critical
phase: MVP — Fase 1 (Meses 1-3)
module: Módulo 1 — Upload e Parsing
epic: Análise de Contratos
created_at: 2026-06-12
author: Vitor (Piloto)
estimated_effort: 8 dias
---

# STORY-002 — Upload e Parsing de Contratos

## Objetivo

Permitir que o usuário faça upload de contratos em PDF, DOCX ou imagens (JPG/PNG) e obtenha extração estruturada automática: partes envolvidas, datas, valores, prazos e cláusulas-chave — como pré-requisito para toda análise subsequente.

---

## Contexto

O SOJ já tem o módulo de contratos com upload básico para o Storage do Supabase, mas **não há parsing do conteúdo**. Toda a análise IA depende de ter o texto extraído e estruturado. Sem este módulo, o Módulo 2 (Análise Jurídica) e o Módulo 3 (Impacto Financeiro) não funcionam.

O diferencial do SOJ começa aqui: extrair não apenas o texto bruto, mas identificar e estruturar os elementos semânticos do contrato (partes, vigência, valores, obrigações).

---

## Escopo (In)

- [x] Upload de arquivos: PDF, DOCX, JPG, PNG — limites por tipo ajustados aos limites reais da Claude API (PDF 32MB, DOCX 50MB, imagem 5MB — ver Completion Notes)
- [x] Extração de texto via Supabase Edge Function:
  - PDF: via Claude (`document` content block), não `pdf-parse`
  - DOCX: `mammoth`
  - Imagens: OCR via Claude Vision API (Haiku)
- [x] Extração estruturada via Claude API (Haiku):
  - Partes envolvidas (contratante, contratado, intervenientes)
  - Data de assinatura, vigência, prazo
  - Valor do contrato, multas, reajustes
  - Cláusulas-chave identificadas (lista de tipos)
  - Classificação automática do tipo de contrato (prestação de serviço, NDA, SaaS, CLT, etc.)
- [x] Salvar resultado estruturado na tabela `contracts` (`parsed_data` JSONB, não colunas separadas — ver Completion Notes)
- [x] Feedback visual de progresso durante upload + parsing
- [x] Estado de erro com mensagem clara se o arquivo for ilegível

## Fora do Escopo (Out)

- Análise de risco jurídico — STORY-003
- Cálculo de impacto financeiro — STORY-004
- Múltiplos contratos em lote (batch upload) — fase futura

---

## Critérios de Aceitação

```
Dado que o usuário está na tela de upload de contratos
Quando ele seleciona um arquivo PDF válido e clica em "Analisar"
Então o sistema:
  - Faz upload para o Storage bucket "contracts"
  - Extrai o texto do PDF
  - Identifica as partes envolvidas
  - Identifica data de assinatura e vigência
  - Identifica valores monetários mencionados
  - Classifica o tipo de contrato
  - Salva resultado estruturado no banco
  - Exibe resumo extraído na UI antes de prosseguir para análise

Dado que o arquivo é uma imagem (JPG/PNG)
Quando o sistema processa
Então usa Claude Vision API para OCR antes do parsing estruturado

Dado que o arquivo está corrompido ou ilegível
Quando o sistema tenta extrair
Então exibe erro claro com orientações para o usuário
```

---

## Tarefas Técnicas

### Backend (Edge Functions)
- [x] `supabase/functions/parse-contract/index.ts` — Edge Function principal
  - Recebe `contract_id`, busca arquivo no Storage
  - Detecta tipo do arquivo (MIME type)
  - Branch: PDF → Claude (document block), DOCX → `mammoth`, Imagem → Claude Vision
  - Chama Claude API (Haiku) para extração estruturada
  - Salva resultado em `contracts.parsed_data` (JSONB)
  - Atualiza `contracts.status` para `em_analise` ou reverte para `aguardando` em erro (nomenclatura diferente do spec, mesma função)

### Banco de Dados
- [x] Migration: adicionar colunas em `contracts` — apenas `parsed_data JSONB` foi adicionado (`20260612211015_add_parsed_data_to_contracts.sql`). Os campos `contract_type`, `parties`, `effective_date`, `expiry_date`, `contract_value` NÃO foram criados como colunas dedicadas — vivem dentro do JSONB `parsed_data`. `parse_status`/`parse_error` não existem; o status de parsing é refletido em `contracts.status` (aguardando/em_analise/analisado).

### Frontend
- [x] Atualizar `src/pages/Contracts.tsx` — indicador de status via `StatusBadge`
- [x] Criar `src/features/contracts/components/ContractParseStatus.tsx` — criado nesta sessão; encapsula o mapeamento de status (aguardando/em_analise/analisado) para `StatusBadge`, substituindo a função local `statusLabel` em `Contracts.tsx`
- [x] Criar `src/features/contracts/components/ParsedDataSummary.tsx` — criado nesta sessão; extraído da função local que existia em `src/pages/Analysis.tsx`
- [x] Atualizar hook `useContracts` para incluir `parsed_data` na query
- [x] Trigger automático: `useContracts.ts:164` chama `parse-contract` após upload bem-sucedido

### Segurança
- [x] Claude API key: armazenado como Supabase Secret (`Deno.env.get('ANTHROPIC_API_KEY')`), nunca referenciado no frontend
- [x] Edge Function: valida `contract_id` via `userClient` (RLS) antes de processar
- [x] Limitar tamanho de arquivo no upload — substituído limite único de 20MB por limites por tipo: PDF 32MB (limite real do Claude document block), DOCX 50MB (sem dependência de API externa), imagem 5MB (limite real do Claude Vision) — `src/pages/Contracts.tsx`

---

## Dependências

- Supabase Edge Functions habilitadas no projeto `igolxkyahbavripvfeak`
- Claude API key configurada como Supabase Secret (`CLAUDE_API_KEY` ou `ANTHROPIC_API_KEY`)
- Storage bucket `contracts` já existe (criado na STORY-001)

---

## Definition of Done

- [x] `npm run typecheck` — sem erros
- [x] `npm run lint` — sem erros (5 warnings pré-existentes não relacionados)
- [ ] Upload de PDF extrai partes, datas e valores corretamente (teste manual com contrato real)
- [ ] Upload de imagem usa OCR e retorna dados estruturados
- [ ] Arquivo corrompido exibe erro legível
- [ ] RLS verificado: usuário não acessa contratos de outra organização
- [ ] Edge Function deployada no projeto Supabase
- [ ] Story atualizada para `status: Done`

---

## Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| PDF com scan sem OCR embutido | Alta | Alto | Fallback para Claude Vision API |
| Custo Claude API por volume | Média | Médio | Usar Haiku para parsing, Sonnet para análise jurídica |
| DOCX com formatação complexa | Média | Baixo | `mammoth` cobre casos comuns; documentar limitações |

---

## Referências

- Documento Estratégico: Módulo 1 (Camada Entrada de Dados)
- `src/pages/Contracts.tsx` — tela atual de contratos
- `src/hooks/useContracts.ts` — hook de dados
- `src/lib/supabase.ts` — cliente Supabase

---

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6 (auditoria de código existente, sem nova implementação nesta sessão)

### Completion Notes List

- Funcionalidade essencial da story está implementada e em uso em produção (Edge Function `parse-contract` + UI em `Contracts.tsx`/`Analysis.tsx`), mas com desvios em relação à especificação original de tarefas:
  - Dados estruturados ficam em `contracts.parsed_data` (JSONB) — não foram criadas as colunas dedicadas `contract_type`, `parties`, `effective_date`, `expiry_date`, `contract_value`, `parse_status`, `parse_error` previstas na migration do Escopo.
  - Não existem os componentes `ContractParseStatus.tsx` e `ParsedDataSummary.tsx` em `src/features/contracts/` — o resumo de dados extraídos foi implementado como função local dentro de `src/pages/Analysis.tsx`.
  - Extração de PDF usa Claude (`document` content block) em vez de `pdf-parse`.
- **Implementado nesta sessão:** limite de upload único de 20MB foi substituído por limites por tipo de arquivo, alinhados aos limites reais downstream:
  - Imagem (JPG/PNG): **5MB** — limite da Claude Vision API; o limite anterior de 20MB permitiria uploads que falhariam silenciosamente no parsing.
  - PDF: **32MB** — limite do Claude `document` content block usado em `parse-contract`.
  - DOCX: **50MB** — sem dependência de API externa (`mammoth` roda local na Edge Function), por isso usa o valor pleno pedido no Escopo original.
  - Mensagens de erro e texto de ajuda na dropzone atualizados para refletir os limites por tipo.
  - `npm run typecheck` e `npm run lint` executados sem novos erros (apenas 5 warnings pré-existentes não relacionados).
- Recomendação: @po decidir se os desvios remanescentes (colunas dedicadas, componentes separados) são aceitáveis para `Done` ou se devem ser formalizados como mudança de escopo.

### File List
- `src/pages/Contracts.tsx` — limites de upload por tipo de arquivo (substituindo `MAX_BYTES` único de 20MB); removida função local `statusLabel`, substituída por `ContractParseStatus`
- `src/features/contracts/components/ContractParseStatus.tsx` — novo componente
- `src/features/contracts/components/ParsedDataSummary.tsx` — novo componente (extraído de `Analysis.tsx`)
- `src/pages/Analysis.tsx` — removida função local `ParsedDataSummary` e imports não mais usados (`Banknote`, `Calendar`, `Users`, `List`, tipo `ParsedData`); agora importa o componente de `@/features/contracts/components/ParsedDataSummary`

### Change Log
| Data | Mudança | Autor |
|---|---|---|
| 2026-06-20 | Checkboxes de Escopo e Tarefas Técnicas corrigidos para refletir implementação real já existente no código (parse-contract, Contracts.tsx, Analysis.tsx, useContracts.ts) | @dev (Dex) |
| 2026-06-20 | Implementado limite de upload por tipo de arquivo (PDF 32MB, DOCX 50MB, imagem 5MB) em `src/pages/Contracts.tsx`, alinhado aos limites reais da Claude API usados em `parse-contract` | @dev (Dex) |
| 2026-06-20 | Extraídos `ContractParseStatus.tsx` e `ParsedDataSummary.tsx` para `src/features/contracts/components/`, alinhando o código à estrutura Bulletproof React do CLAUDE.md. `npm run typecheck` e `npm run lint` sem novos erros. | @dev (Dex) |
