---
id: STORY-003
title: Análise Jurídica com IA via Claude API
status: InProgress
type: Feature
priority: Critical
phase: MVP — Fase 1 (Meses 1-3)
module: Módulo 2 — Análise Jurídica com IA
epic: Análise de Contratos
created_at: 2026-06-12
author: Vitor (Piloto)
depends_on: STORY-002
estimated_effort: 10 dias
---

# STORY-003 — Análise Jurídica com IA via Claude API

## Objetivo

Dado um contrato já parseado (STORY-002), executar análise jurídica profunda via Claude API que identifique cláusulas de risco, atribua um score de risco 0-100 e gere recomendações acionáveis — com conformidade verificada em relação ao Código Civil/2002, CLT e LGPD.

---

## Contexto

Este é o coração da proposta de valor do SOJ. O usuário envia um contrato e recebe em minutos a análise que levaria horas de um advogado júnior. O SOJ não substitui o advogado — ele entrega a inteligência para que o advogado (ou o empresário) tome decisões informadas.

O SOJ já tem a tela de análise (`src/pages/Analysis.tsx`) com dados mockados em `src/data/soj.ts`. Esta story **substitui os mocks por dados reais** gerados pela Claude API.

### Tipos de cláusulas a identificar (50+ tipos)
Exemplos prioritários para MVP:
- Penalidade excessiva / multa desproporcional
- Cláusula de não-concorrência abusiva
- Prazo de vigência indefinido sem rescisão unilateral
- Ausência de limitação de responsabilidade
- Foro inadequado / cláusula de arbitragem desequilibrada
- Reajuste unilateral de preços
- Condições de pagamento com juros abusivos
- Transferência de propriedade intelectual total e irrevogável
- Ausência de cláusula LGPD para dados pessoais
- Rescisão sem justa causa sem indenização

---

## Escopo (In)

- [x] Edge Function `analyze-contract` que recebe `contract_id` com texto parseado
- [x] Prompt engineering para Claude Sonnet (modelo atual `claude-sonnet-4-6`, não 3.7 — ver Completion Notes)
- [x] Identificação de cláusulas de risco no MVP (sem limite mínimo fixo de 20 tipos codificado; depende do prompt/contrato)
- [x] Score global de risco 0-100 — categorias são geradas livremente pelo prompt (campo `category` em texto), não como breakdown estruturado fixo por categoria
- [x] Para cada cláusula de risco identificada:
  - Texto exato da cláusula (trecho) — `original_text`
  - Nível de risco: crítico / alto / médio / baixo — `severity`
  - Artigo legal violado ou em risco — não há campo dedicado `legal_basis`; a referência legal aparece embutida no `summary`/`suggestion`, não estruturada por cláusula
  - Recomendação de redação alternativa — `suggestion`
- [x] Salvar análise em `contract_analyses` com `status: completed`
- [x] Substituir mocks de `src/data/soj.ts` por dados reais na tela de análise (`Analysis.tsx` consome `useContractAnalysis`, sem mocks)

## Fora do Escopo (Out)

- Cálculo de impacto financeiro em R$ — STORY-004
- Sugestão de redação completa do contrato — fase futura
- Análise comparativa entre versões do contrato — fase futura

---

## Critérios de Aceitação

```
Dado que um contrato foi parseado (status = 'parsed')
Quando o usuário clica em "Analisar Contrato"
Então o sistema:
  - Chama Edge Function com o texto do contrato
  - Exibe loading state com tempo estimado (20-45 segundos)
  - Retorna score global de risco (0-100)
  - Lista todas as cláusulas de risco identificadas com nível e recomendação
  - Salva o resultado em contract_analyses
  - Exibe o resultado completo na tela de análise

Dado que a análise está em progresso
Quando o usuário navega para outra tela e volta
Então o resultado já está disponível (persisted no banco)

Dado que um contrato não tem cláusulas de risco críticas
Então o score é apresentado como "Baixo Risco" com badge verde

Dado que a API Claude está indisponível
Então o sistema exibe erro amigável e oferece opção de tentar novamente
```

---

## Tarefas Técnicas

### Edge Function
- [x] `supabase/functions/analyze-contract/index.ts`
  - Busca `contracts.parsed_data` pelo `contract_id`
  - Valida que o contrato pertence à organização do usuário
  - Chama Claude API (Sonnet 3.7) com prompt jurídico estruturado
  - Parseia resposta JSON da Claude
  - Salva em `contract_analyses`:
    ```typescript
    {
      contract_id,
      risk_score: number, // 0-100
      risk_level: 'low' | 'medium' | 'high' | 'critical',
      categories: Record<string, { score: number, issues: Issue[] }>,
      clauses: Array<{
        text: string,
        type: string,
        risk_level: string,
        legal_basis: string,
        recommendation: string,
      }>,
      summary: string,
      status: 'completed' | 'error',
      analyzed_at: string,
    }
  ```

### Banco de Dados
- [x] Migration: colunas em `contract_analyses` — implementadas com nomes/estrutura diferentes do spec:
  - `risk_score`, `risk_level`, `summary`, `model_used` ✅ (existem)
  - `categories` (JSONB) e `tokens_used` ❌ não existem — usa `tokens_input`/`tokens_output` separados; não há coluna `categories` (categoria vive dentro de cada item de `clauses`)
  - `clauses` não é coluna de `contract_analyses` — é uma tabela relacional própria `clause_risks` (FK `analysis_id`)
  - `model_used` default é `claude-sonnet-4-6` na prática, não `claude-sonnet-4-5`

### Prompt Engineering
- [x] Prompt jurídico implementado inline em `supabase/functions/analyze-contract/index.ts` (constante `SYSTEM_PROMPT`), não em arquivo `prompt.ts` separado
  - System prompt: advogado especialista em direito empresarial brasileiro ✅
  - Instrução de output: JSON estruturado ✅
  - Referências legais: CC/2002, CLT, LGPD, CDC citadas no system prompt ✅
  - Escala de risco definida (crítico/alto/médio/baixo) ✅
  - Limite de 50 cláusulas por análise ✅ (`.slice(0, 50)`)

### Frontend
- [x] Atualizar `src/pages/Analysis.tsx` — consome dados reais de `contract_analyses`/`clause_risks`
- [x] Hook de análise — criado em `src/hooks/useContractAnalysis.ts` (não em `src/features/analysis/hooks/`, conforme convenção atual do projeto que centraliza hooks em `src/hooks/`)
- [ ] `RiskClauseCard.tsx` — não existe como componente separado; renderização de cláusula é inline em `AnalisadoView` dentro de `Analysis.tsx`
- [ ] `RiskScoreGauge.tsx` — não existe com esse nome; usa `GaugeChart` de `src/components/layout/Charts.tsx`
- [ ] `AnalysisProgress.tsx` — não existe como componente separado; loading state com texto de ETA é inline em `InAnaliseView`
- [x] Mocks de `src/data/soj.ts` removidos da tela de análise

### Segurança
- [x] Conteúdo do contrato não é logado (apenas `console.error` com mensagem de erro, sem o texto do contrato)
- [x] Rate limiting de 10 análises/hora por organização — implementado nesta sessão em `analyze-contract/index.ts` (conta `contract_analyses` da última hora via embed `contracts!inner(org_id)`; retorna HTTP 429 com mensagem amigável)
- [x] Validação de `contract_id` pertence à organização via RLS (`userClient`) antes de analisar

---

## Dependências

- STORY-002 concluída (parsing com texto extraído)
- `ANTHROPIC_API_KEY` configurada como Supabase Secret
- Modelo Claude Sonnet 4.5 ou 3.7 disponível via API

---

## Definition of Done

- [x] `npm run typecheck` — sem erros
- [x] `npm run lint` — sem erros (5 warnings pré-existentes não relacionados)
- [ ] Análise de contrato real retorna score + cláusulas em < 60 segundos
- [ ] Tela `Analysis.tsx` exibe dados reais (sem mocks)
- [ ] RLS verificado: análise visível apenas para a organização dona do contrato
- [ ] Edge Function deployada e funcional
- [ ] Pelo menos 3 tipos de contrato testados (prestação de serviço, NDA, SaaS)
- [ ] Story atualizada para `status: Done`

---

## Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Latência Claude API > 60s para contratos longos | Média | Médio | Streaming response + chunking por seção |
| Custo por análise elevado (Sonnet) | Média | Médio | Monitorar tokens; considerar cache de análises idênticas |
| Falso positivo / negativo na identificação de risco | Média | Alto | Iterar prompt com feedback de advogado parceiro |
| Limites de contexto em contratos muito longos (>100k tokens) | Baixa | Alto | Chunking inteligente por seção + sumarização progressiva |

---

## Referências

- Documento Estratégico: Módulo 2 (Camada Análise e IA), Diferenciais Competitivos
- `src/pages/Analysis.tsx` — tela atual (dados mockados)
- `src/data/soj.ts` — mocks a serem substituídos
- `src/types/database.types.ts` — schema atual de `contract_analyses`

---

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6 (auditoria de código existente, sem nova implementação nesta sessão)

### Completion Notes List

- O coração da story — análise jurídica real via Claude com score, cláusulas e recomendações — está implementado e funcional em produção (`supabase/functions/analyze-contract/index.ts` + `src/pages/Analysis.tsx`).
- Desvios do spec original de tarefas que permanecem:
  - Não há campo estruturado de base legal (`legal_basis`) por cláusula — a referência legal fica embutida em texto livre.
  - Componentes de UI não foram extraídos como arquivos separados (`RiskClauseCard`, `RiskScoreGauge`, `AnalysisProgress`) — tudo está inline em `Analysis.tsx`, o que diverge da convenção Bulletproof React do `CLAUDE.md` (componentes deveriam viver em `features/`).
  - Estrutura de dados usa tabela relacional `clause_risks` em vez de JSONB `clauses` dentro de `contract_analyses` — divergência de schema, mas equivalente funcionalmente (e arguivelmente melhor normalizada).
- **Implementado nesta sessão:** rate limiting de 10 análises/hora por organização em `analyze-contract/index.ts` — conta registros de `contract_analyses` na última hora filtrando pelo `org_id` do contrato via embed `contracts!inner(org_id)` e retorna HTTP 429 com mensagem amigável antes de chamar a Claude API.
  - Corrigido também um bug latente em `useContractAnalysis.ts`: `triggerAnalysis` só lia `error.message` do `FunctionsHttpError`, que é sempre a string genérica "Edge Function returned a non-2xx status code" — a mensagem real (incluindo a de rate limit e a de `ANTHROPIC_API_KEY` ausente) está no corpo da resposta, acessível via `error.context.json()`. Sem essa correção, nenhuma mensagem de erro específica da Edge Function chegava à UI.
  - **Atualização 2026-06-24:** deployado em produção (`supabase functions deploy analyze-contract`/`parse-contract`) — até esta data, ambas as funções estavam rodando a versão de 2026-06-12, ou seja, o rate limiting e a correção do `parse-contract` (limites de upload por tipo, na verdade essa é client-side, não afeta a função) nunca tinham ido ao ar. A sintaxe de filtro embutido `.eq('contracts.org_id', ...)` ainda não foi testada com uma chamada real de análise (recomenda-se testar manualmente: analisar 11 contratos na mesma hora pela mesma org e confirmar que o 11º recebe HTTP 429).
- Recomendação: @po avaliar se vale abrir débito técnico para extrair os componentes inline de `Analysis.tsx` (hoje com ~970 linhas, acima do limite de 300 linhas definido em `CLAUDE.md`).

### File List
- `supabase/functions/analyze-contract/index.ts` — adicionado rate limiting de 10 análises/hora por organização (HTTP 429)
- `src/hooks/useContractAnalysis.ts` — `triggerAnalysis` agora extrai a mensagem de erro real do corpo da resposta (`error.context.json()`) em vez de usar a mensagem genérica do `FunctionsHttpError`

### Change Log
| Data | Mudança | Autor |
|---|---|---|
| 2026-06-20 | Checkboxes de Escopo e Tarefas Técnicas corrigidos para refletir implementação real já existente no código (analyze-contract, Analysis.tsx, useContractAnalysis.ts) | @dev (Dex) |
| 2026-06-20 | Implementado rate limiting de 10 análises/hora por organização em `analyze-contract`; corrigido bug em `useContractAnalysis.ts` que impedia mensagens de erro da Edge Function de chegar à UI. `npm run typecheck` e `npm run lint` sem novos erros. | @dev (Dex) |
