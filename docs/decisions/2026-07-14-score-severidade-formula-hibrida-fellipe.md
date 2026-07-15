---
title: Score de Risco — Critérios de Severidade e Fórmula Híbrida (implementados)
status: Implementado em produção — aguardando calibração contra gabarito
created_at: 2026-07-14
author: "@dev (Dex)"
audience: "Fellipe (sócio, revisão jurídica) — resumo do que foi implementado a partir das decisões fechadas com ele"
---

# Score de Risco — Critérios de Severidade e Fórmula Híbrida

Fellipe — este documento resume o que foi implementado em produção a partir das decisões que fechamos sobre o score de risco: os critérios de severidade das cláusulas e a fórmula híbrida do score final.

## 1. Critérios de Severidade

A classificação de cada cláusula (crítico/alto/médio/baixo) usa os exemplos que você definiu como **piso mínimo, não lista exaustiva**. A instrução exata dada à IA é:

> *"Classifique usando os critérios abaixo como referência mínima. Se a cláusula se enquadrar em um dos exemplos, use o nível indicado. Se não se enquadrar em nenhum exemplo mas ainda representar risco real, classifique pelo seu julgamento e acrescente uma justificativa curta (até 6 palavras) entre parênteses no final do título."*

### Os quatro níveis

| Nível | Definição | Exemplos |
|---|---|---|
| **Crítico** | Risco existencial ou financeiro desproporcional | Multa rescisória sem teto; indenização ilimitada; garantia pessoal ilimitada dos sócios/administradores; ausência total de limitação de responsabilidade; confissão de dívida; multa penal que excede o valor da obrigação principal (art. 412 CC); renúncia a direito de defesa/contraditório em disputa |
| **Alto** | Risco financeiro relevante, porém limitável | Rescisão unilateral sem indenização (mesmo com aviso prévio); multa elevada mas dentro do padrão de mercado; renovação automática sem opção clara de saída; não concorrência excessivamente ampla em escopo/prazo; reajuste vinculado a índice desfavorável ou não definido; exclusividade sem contrapartida |
| **Médio** | Risco operacional, sem exposição financeira direta clara | Ausência de SLA definido; prazo de pagamento desfavorável; confidencialidade não recíproca; ausência de mecanismo de resolução de disputas (mediação/arbitragem) antes da via judicial |
| **Baixo** | Questão formal ou de redação, sem risco material | Ausência de cláusula de foro; erro de referência cruzada entre cláusulas; inconsistência de formatação/numeração/terminologia |

**Por que "piso mínimo" e não lista fechada:** se travássemos a IA só nesses exemplos, ela perderia a capacidade de identificar riscos atípicos — que é justamente onde a análise por IA agrega mais valor (encontrar o que uma checklist fixa não previu). Quando a cláusula não se encaixa em nenhum exemplo, a IA usa julgamento próprio e é obrigada a justificar em poucas palavras no título — dá rastreabilidade sem engessar a análise.

**Status:** implementado em produção desde 10/07/2026, validado com contratos reais. Um teste recente identificou corretamente cláusulas críticas fora da lista literal de exemplos (ex.: "renúncia irrevogável a defesas jurisdicionais", "ausência de cap de indenização"), com julgamento justificado no título.

---

## 2. Fórmula Híbrida do Score

O score de risco (0-100) deixou de ser uma nota livre da IA e passou a ser **calculado deterministicamente** a partir da severidade de cada cláusula identificada. A IA continua responsável por encontrar e classificar cada cláusula; a nota final do contrato é sempre a mesma para o mesmo conjunto de cláusulas — 100% auditável e reproduzível.

### Como funciona

1. **Piso pela pior cláusula encontrada** — a severidade mais grave presente no contrato define uma nota-base:
   - Crítico → 70
   - Alto → 45
   - Médio → 20
   - Baixo → 5
   - Nenhuma cláusula de risco → 0

2. **Agravante por cada cláusula adicional** — todas as outras cláusulas (menos a que já definiu o piso) somam pontos conforme a própria severidade:
   - Crítico → +10 cada
   - Alto → +5 cada
   - Médio → +2 cada
   - Baixo → +1 cada

3. **Score final = piso + soma dos agravantes, capado em 100.**

### Exemplos (validados contra os 4 casos de teste originais)

| Cenário | Cálculo | Score |
|---|---|---|
| 1 cláusula crítica sozinha | 70 + 0 | 70 |
| 4 cláusulas críticas | 70 + (3×10) | 100 (capado) |
| 13 cláusulas baixas | 5 + (12×1) | 17 |
| 1 alta + 5 baixas | 45 + (5×1) | 50 |

### Teste real em produção

Contrato de NDA já analisado: 3 críticas + 5 altas + 5 médias → piso 70 + agravantes (2×10 + 5×5 + 5×2 = 55) = 125, capado em **100**. Bateu exatamente com o esperado.

### Importante — pesos ainda não calibrados

Os valores acima (70/45/20/5 e 10/5/2/1) são a proposta inicial sua, implementados como estão a pedido do Vitor — sem esperar a calibração. Continuam **não validados** contra o gabarito dos 100 contratos. Quando você fizer a avaliação manual (nota 0-100 por contrato, pelo menos ~30 já servem para uma primeira calibração), comparamos o score calculado com o seu julgamento e ajustamos os pesos se necessário. Isso não muda a fórmula em si — só os números de piso/agravante.

---

## Correção técnica feita junto (não muda a metodologia, só a confiabilidade)

Durante os testes, encontramos e corrigimos um bug real: o parsing da resposta da IA em JSON de texto livre falhava esporadicamente por erro de sintaxe (aspas/caracteres especiais dentro de trechos copiados do contrato). Trocamos a abordagem para **tool use** da própria API da Anthropic, que força a resposta a vir em formato estruturado — elimina essa classe de erro de forma definitiva, sem afetar os critérios de severidade nem a fórmula do score.
