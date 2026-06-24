---
id: STORY-004
title: Análise de Impacto Financeiro por Cláusula
status: InProgress
type: Feature
priority: Critical
phase: MVP — Fase 1 (Meses 1-3)
module: Módulo 3 — Análise de Impacto Financeiro
epic: Análise de Contratos
created_at: 2026-06-12
author: Vitor (Piloto)
depends_on: STORY-003
estimated_effort: 12 dias
---

# STORY-004 — Análise de Impacto Financeiro por Cláusula

## Objetivo

Para cada cláusula de risco identificada (STORY-003), calcular o impacto financeiro potencial em R$ — transformando linguagem jurídica abstrata em números concretos de exposição financeira. Este é o **diferencial central do SOJ** no mercado brasileiro.

---

## Contexto

### O Diferencial que Justifica o SOJ

Qualquer sistema de análise jurídica pode dizer "esta cláusula é de alto risco". O SOJ vai além: **"esta cláusula pode custar até R$ 280.000 à sua empresa"**.

Isso muda completamente a conversa. Empresas tomam decisões baseadas em risco financeiro, não em conceitos jurídicos. O SOJ traduz o direito para a linguagem dos negócios.

### O que o SOJ vai calcular

Exemplo real de output esperado:

> **Cláusula 8.3 — Multa por Rescisão Antecipada**
> Risco: CRÍTICO
> Exposição financeira estimada: **R$ 180.000 – R$ 240.000**
> Base de cálculo: 30% do valor total do contrato (R$ 800.000) + juros SELIC de 12% a.a. projetados por 18 meses de prazo remanescente
> Recomendação: Negociar multa máxima de 10% ou incluir escalonamento por mês cumprido

### Índices utilizados

- **SELIC:** para projeção de juros e correção monetária
- **IPCA:** para contratos com reajuste por inflação
- **INPC:** para contratos de prestação de serviços (CLT)
- **IGP-M:** opcional — contratos imobiliários / locação

---

## Escopo (In)

- [ ] Edge Function `calculate-financial-impact` — não existe como função separada. O cálculo de exposição (`exposure_likely`) é feito **dentro de** `analyze-contract` (mesma chamada Claude que identifica as cláusulas), não em uma função dedicada recebendo `analysis_id`
- [x] Para cada cláusula de risco da análise (STORY-003):
  - Identificar valor financeiro base — feito via prompt do Claude em `analyze-contract` (`exposure_likely_cents`)
  - Calcular exposição — `analyze-contract` grava `exposure_min`/`exposure_max` (derivados de `exposure_likely`, não de fórmula financeira própria); a UI agora exibe essa faixa (ver Completion Notes desta sessão) em vez do valor único anterior
  - Aplicar índices de correção (SELIC/IPCA) — exibidos como referência informativa na aba Financeiro, não aplicados ao cálculo de exposição por cláusula
  - Projetar multas compostas no prazo do contrato — não implementado
- [x] Dashboard financeiro consolidado por contrato (`Analysis.tsx`, aba "Financeiro"):
  - Exposição total — exibida como valor único (`financial_total`), sem breakdown mínimo/máximo
  - Breakdown por categoria — não há agregação por categoria; lista é por cláusula individual com barra de proporção
  - "Top 3 cláusulas mais custosas" — não há destaque específico de top 3, mas lista é ordenável visualmente por exposição
- [x] Simulador interativo: `FinancialSimulator` em `Analysis.tsx` — usuário informa valor real, sistema calcula % de exposição e persiste via `saveContractValue`
- [x] Buscar índices econômicos — `supabase/functions/fetch-economic-indexes/index.ts` (cron diário, BCB/IBGE)
- [ ] Persistir resultado em `contract_analyses.financial_impact` (JSONB) — coluna existe na migration mas não é populada; o valor real fica em `contract_analyses.financial_total` (numeric) e `clause_risks.exposure_likely`

## Fora do Escopo (Out)

- Cálculo de honorários advocatícios — fase futura
- Comparação de cenários de negociação — fase futura
- Integração com sistemas contábeis (SAP, TOTVS) — fase futura

---

## Critérios de Aceitação

```
Dado que uma análise jurídica foi concluída (STORY-003)
Quando o sistema processa o impacto financeiro
Então para cada cláusula de risco identificada:
  - Exibe valor de exposição em R$ (mínimo e máximo)
  - Exibe base de cálculo explicada em linguagem simples
  - Exibe índice econômico usado (SELIC/IPCA/INPC) com valor atual

Dado que o contrato menciona um valor de R$ 500.000
Quando há uma cláusula de multa de 20% por rescisão
Então o sistema calcula:
  - Exposição base: R$ 100.000
  - Com juros SELIC de X% a.a. por Y meses: R$ 100.000 + X%

Dado que o contrato não menciona valor
Então o sistema usa valor estimado por tipo/setor (informado pelo usuário)
  com disclaimer claro de que é uma estimativa

Dado que o usuário informa o valor real do contrato no simulador
Quando ele clica em "Recalcular"
Então todos os valores de exposição são recalculados em tempo real
  sem reprocessar a análise jurídica

Dado que a API do Banco Central está indisponível
Então o sistema usa os últimos índices disponíveis em cache (max 24h)
```

---

## Tarefas Técnicas

### Edge Function: Cálculo de Impacto
- [ ] `supabase/functions/calculate-financial-impact/index.ts` — não existe; lógica equivalente embutida em `analyze-contract/index.ts`
  - Busca análise e cláusulas de `contract_analyses`
  - Para cada cláusula: chama Claude Haiku para extrair valor monetário base e tipo de cálculo
  - Aplica fórmulas de cálculo financeiro (juros compostos, multa, SELIC)
  - Salva em `contract_analyses.financial_impact`:
    ```typescript
    {
      total_exposure: { min: number, max: number },
      by_category: Record<string, { min: number, max: number }>,
      clauses: Array<{
        clause_id: string,
        exposure: { min: number, max: number },
        calculation_basis: string,
        index_used: 'SELIC' | 'IPCA' | 'INPC' | 'fixed' | 'estimated',
        index_rate: number,
      }>,
      indexes_snapshot: {
        selic: number,
        ipca_12m: number,
        inpc_12m: number,
        fetched_at: string,
      },
      calculated_at: string,
    }
    ```

### Edge Function: Índices Econômicos
- [x] `supabase/functions/fetch-economic-indexes/index.ts`
  - Cron diário (Supabase cron) — implementado
  - Buscar SELIC, IPCA 12m via API pública — implementado
  - INPC 12m — verificar cobertura exata no código (tabela `economic_indexes` tem `inpc_12m` seedado)
  - Salva em tabela `economic_indexes` — schema usa `UNIQUE(name)` em vez de chave composta com `period`, mas atende ao objetivo

### Banco de Dados
- [x] Migration para `economic_indexes` (`20260612212822_story004_financial_impact.sql`, sem RLS, GRANT SELECT authenticated/anon)
- [ ] `financial_impact JSONB` em `contract_analyses` — coluna criada na migration mas não é populada (ver nota no Escopo)
- [x] `contract_value_informed NUMERIC` em `contracts` — criado e usado pelo simulador

### Frontend
- [x] Painel de impacto financeiro — implementado como seção/aba "Financeiro" inline em `src/pages/Analysis.tsx`, não como componente separado `FinancialImpactPanel.tsx` em `features/analysis/`
  - Exposição total em destaque ✅
  - Lista de cláusulas com exposição individual ✅ (com barra de proporção)
  - Badge/seção de índices econômicos ✅
- [x] Simulador — implementado como função `FinancialSimulator` inline em `Analysis.tsx`, não em arquivo separado
  - Input de valor real ✅
  - Recálculo client-side ✅ (% de exposição sobre valor informado)
- [x] `Analysis.tsx` tem seção de impacto financeiro (aba "Financeiro")
- [ ] Hook dedicado `useFinancialImpact.ts` — não existe; dados vêm de `useContractAnalysis` e `useEconomicIndexes`

### Design
- [x] Número grande em destaque (exposição total, `text-lg`/`text-xl`, cor de risco)
- [x] Faixa min-máx ("R$ 180.000 – R$ 240.000") — implementado nesta sessão por cláusula (`fmtExposureRange` em `Analysis.tsx`); a exposição total do contrato continua como valor único (`financial_total`, estimativa própria da Claude, não soma de min/max das cláusulas)
- [x] Tooltip por valor explicando o cálculo — implementado nesta sessão (atributo `title` nos badges de exposição, explicando que é uma estimativa de IA, não cálculo financeiro determinístico)
- [x] Disclaimer presente no simulador ("Estimativa baseada nas cláusulas identificadas pela IA. Consulte um advogado...")

---

## Dependências

- STORY-003 concluída (análise jurídica com cláusulas identificadas)
- API Banco Central: `api.bcb.gov.br` (pública, sem auth)
- API IBGE SIDRA: `servicodados.ibge.gov.br` (pública, sem auth)
- Tabela `economic_indexes` criada

---

## Definition of Done

- [x] `npm run typecheck` — sem erros
- [x] `npm run lint` — sem erros (5 warnings pré-existentes não relacionados)
- [ ] Exposição financeira calculada e exibida para 3 contratos reais diferentes
- [ ] Índices SELIC e IPCA atualizados automaticamente (cron funcionando)
- [ ] Simulador interativo recalcula ao alterar valor do contrato
- [ ] Disclaimer legal visível na tela
- [ ] Edge Function `calculate-financial-impact` deployada
- [ ] Story atualizada para `status: Done`

---

## Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| API BCB/IBGE indisponível | Baixa | Médio | Cache de 24h + fallback com último valor disponível |
| Cálculo incorreto gera responsabilidade legal | Baixa | Crítico | Disclaimer claro + revisão de fórmulas com advogado |
| Contratos sem valor explícito (maioria dos NDAs) | Alta | Médio | Solicitar valor ao usuário + estimativa por setor |
| Variação cambial em contratos em USD | Média | Médio | Fase futura — MVP só BRL |

---

## Notas de Produto

Este módulo é o principal argumento de venda do SOJ para PMEs. O CEO que recebe o report com "**Exposição total: R$ 420.000**" vai mostrar para o sócio, vai mostrar para o advogado — e vai assinar o plano Pro.

A visualização deste número deve ser tratada com o mesmo cuidado que um dashboard financeiro: claro, preciso, com contexto suficiente para ser acionável.

---

## Referências

- Documento Estratégico: Módulo 3 (Camada Análise e IA), Diferenciais Competitivos Seção 2
- API Banco Central: https://api.bcb.gov.br/
- `src/pages/Analysis.tsx` — tela de análise atual
- STORY-003 — análise jurídica (pré-requisito)

---

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6 (auditoria de código existente, sem nova implementação nesta sessão)

### Completion Notes List

- O diferencial de produto (exposição financeira em R$ visível na UI + simulador interativo) **está implementado e funcional**, mas a arquitetura real é mais simples que a especificada:
  - Não há Edge Function `calculate-financial-impact` separada — o cálculo de exposição por cláusula acontece dentro do mesmo prompt/chamada de `analyze-contract` (STORY-003), o que é eficiente (uma única chamada à API) mas significa que recalcular o impacto financeiro sem reanalisar juridicamente não é possível hoje.
  - Não há projeção de juros compostos/SELIC aplicada ao valor de exposição — os índices econômicos são exibidos como referência informativa na UI, não usados em fórmula.
  - `contract_analyses.financial_impact` (JSONB) existe na migration mas está sempre vazio — o valor real está em `financial_total` e em `clause_risks.exposure_likely/exposure_min/exposure_max`.
- **Implementado nesta sessão:** a UI passou a exibir a exposição por cláusula como **faixa mínimo–máximo** (`fmtExposureRange` em `src/pages/Analysis.tsx`), usando colunas `exposure_min`/`exposure_max` que já existiam no banco (`clause_risks`) mas não eram lidas pelo hook nem exibidas. Isso atende literalmente ao critério de aceitação "Exibe valor de exposição em R$ (mínimo e máximo)" para cada cláusula. Também foi adicionado tooltip (`title`) explicando que o valor é uma estimativa de IA, não um cálculo financeiro determinístico.
  - Importante: os valores de `exposure_min`/`exposure_max` continuam sendo derivados de `exposure_likely` (min=0, max=likely×2) dentro de `analyze-contract`, não de uma fórmula financeira real (juros, SELIC, etc.). A faixa exibida agora é fiel ao que está no banco, mas o cálculo subjacente ainda não é o "30% do valor + juros SELIC projetados" descrito no Contexto da story — isso permanece como gap de produto, não apenas de UI.
  - A exposição **total** do contrato (`financial_total`, exibida no topo da aba "Financeiro" e na aba "Jurídica") continua como valor único — é uma estimativa própria da Claude, não a soma de `exposure_min`/`exposure_max` das cláusulas, então não foi convertida em faixa nesta sessão (faria sentido apenas se a soma das cláusulas fosse a fonte da verdade do total, o que hoje não é o caso).
- Recomendação: @po e @architect decidirem se vale priorizar uma iteração que implemente o cálculo financeiro real (juros compostos, SELIC) em vez de a IA estimar `exposure_min`/`exposure_max` diretamente — isso é o que o Contexto da story descreve como o verdadeiro diferencial ("30% do valor + juros SELIC"), e hoje ainda não existe.

### File List
- `src/hooks/useContractAnalysis.ts` — `ClauseRisk` agora inclui `exposure_min`/`exposure_max`; query atualizada para selecioná-los
- `src/pages/Analysis.tsx` — nova função `fmtExposureRange`; badges de exposição por cláusula (abas "Jurídica" e "Financeiro") agora exibem faixa min–máx com tooltip explicativo

### Change Log
| Data | Mudança | Autor |
|---|---|---|
| 2026-06-20 | Checkboxes de Escopo e Tarefas Técnicas corrigidos para refletir implementação real já existente no código (fetch-economic-indexes, FinancialSimulator/painel financeiro em Analysis.tsx) | @dev (Dex) |
| 2026-06-20 | Implementada exibição de faixa mínimo–máximo de exposição por cláusula (antes só valor único) + tooltip explicativo. `npm run typecheck` e `npm run lint` sem novos erros. | @dev (Dex) |
