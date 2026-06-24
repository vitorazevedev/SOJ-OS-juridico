---
title: Decisões pendentes — Backlog Fase 1 (STORY-002 a STORY-006)
status: Aguardando @po
created_at: 2026-06-21
author: @dev (Dex)
audience: "@po"
---

# Decisões Pendentes — Backlog Fase 1

## Contexto

Entre 2026-06-20 e 2026-06-21, fiz uma auditoria de código real contra as 5 stories do backlog Fase 1 (STORY-002 a STORY-006). Os checkboxes de tarefas estavam todos zerados mesmo com status `InProgress`/`Backlog`, mas a maior parte da funcionalidade essencial **já estava implementada em produção** — só não documentada como tal.

Durante a auditoria e as correções incrementais que fiz nas stories, identifiquei **5 decisões de produto/arquitetura** que não posso resolver com "mudanças mínimas" — exigem julgamento de negócio ou trade-off explícito. Este documento consolida essas decisões para revisão.

Cada item referencia a seção "Dev Agent Record → Completion Notes" da story correspondente, onde está o detalhe técnico completo.

---

## 1. STORY-004 — Cálculo financeiro real vs. estimativa da IA

**ATUALIZADO em 2026-06-23, após auditoria com acesso real ao Supabase (ver STORY-007):** descobri que **já existem no banco as tabelas `financial_impacts` e `financial_parameters`**, com exatamente a estrutura para um cálculo financeiro real:
- `financial_parameters`: `clause_type`, `formula_type`, `base_multiplier`, `max_cap_pct`, `description` — ou seja, parâmetros de fórmula configuráveis por tipo de cláusula
- `financial_impacts`: `contract_value`, `contract_term`, `exposure_min/max/likely`, `formula_used`, `params_snapshot` — registro do cálculo aplicado, com snapshot dos parâmetros usados (auditável)

**Nenhum código hoje lê ou escreve nessas tabelas.** Isso muda o trade-off original: o esforço para "implementar cálculo financeiro real" não é mais "criar uma Edge Function do zero com lógica de juros compostos" — é **popular `financial_parameters` com os multiplicadores certos e escrever a lógica que usa esse schema já pronto**. Schema e responsabilidade financeira (auditoria via `params_snapshot`) já foram pensados por quem desenhou o banco — só não foi conectado ao restante do produto.

**O que existe hoje em produção:** a Claude API estima a exposição financeira (`exposure_likely`) diretamente como parte da mesma chamada que identifica as cláusulas de risco (STORY-003), gravando em `clause_risks`, não em `financial_impacts`. A faixa mínimo-máximo exibida na UI é derivada matematicamente desse valor único (`min=0`, `max=likely×2`), não de uma fórmula financeira real.

**O que o Contexto da story descreve como esperado:** "30% do valor total do contrato + juros SELIC de 12% a.a. projetados por 18 meses de prazo remanescente" — ou seja, um cálculo determinístico com base em juros compostos, não uma estimativa de IA.

**Trade-off (revisado):**
| Manter como está (estimativa da IA em `clause_risks`) | Conectar ao schema já existente (`financial_parameters`/`financial_impacts`) |
|---|---|
| Já funciona, zero esforço adicional | Esforço menor do que se pensava — schema e auditoria (`params_snapshot`) já existem |
| Resultado pode ser inconsistente entre análises do mesmo contrato | Resultado auditável e reproduzível — relevante para responsabilidade legal |
| Mais rápido para o beta | Mais alinhado ao discurso de venda e ao que o próprio time (ou Lovable) já projetou no banco |

**Pergunta para @po e @architect:** alguém (Lovable? sessão anterior?) desenhou esse schema com intenção clara — vocês sabem o histórico disso? Vale priorizar conectar essa funcionalidade já modelada, em vez de manter a estimativa da IA?

---

## 2. STORY-005 — `RESEND_API_KEY` ausente bloqueia validação end-to-end

**O que existe hoje:** o cron de alertas (`send-obligation-alerts`) roda diariamente, identifica obrigações vencendo em 30/15/7/0 dias e tenta enviar email — mas sem a chave, ele roda em modo *dry-run* (só loga no console).

**Impacto:** não há como validar o critério de aceitação "email de alerta enviado 30 dias antes" nem o item de Definition of Done correspondente. Isso já estava registrado na memória do projeto como item pendente antes desta auditoria (`ANTHROPIC_API_KEY`/`RESEND_API_KEY` — você mencionou estar discutindo custo com os sócios).

**Pergunta para @po:** confirma que esse é o único bloqueador restante para considerar a STORY-005 testável, e que a decisão de configurar `RESEND_API_KEY` está mesmo pendente de alinhamento financeiro (não é algo que eu deveria resolver via dev)?

---

## 3. STORY-006 — Ausência de personalização via Claude API no Gerador de Contratos

**O que existe hoje:** o wizard de geração de contratos funciona de ponta a ponta (6 templates, export PDF/DOCX, logo, validação Zod agora implementada) — mas a "geração" é 100% substituição de variáveis em template estático no cliente. Não há nenhuma chamada à Claude API.

**O que o Escopo e os Critérios de Aceitação descrevem como esperado:** "Chama Claude API para personalizar o template" — ou seja, a IA deveria adaptar a linguagem jurídica ao contexto específico informado pelo usuário (setor, partes, condições).

**Trade-off:**
| Manter como está (templates estáticos) | Adicionar personalização via Claude |
|---|---|
| Sem custo de API por geração | Custo por geração (Sonnet ou Haiku) |
| Mais simples, sem Edge Function nova | Exige `supabase/functions/generate-contract/index.ts` |
| Contrato sempre previsível/testável | Linguagem adaptada ao contexto — mais alinhado à proposta de valor "IA jurídica" do SOJ |

**Pergunta para @po e @architect:** essa é uma decisão de arquitetura, não só de prioridade — vale a pena adicionar a chamada à Claude para o MVP, ou os templates estáticos (já revisados juridicamente, conforme nota da própria story) são suficientes para o beta?

---

## 4. Débito técnico transversal — Componentes inline acima do limite de linhas do `CLAUDE.md`

**O que existe hoje:** `src/pages/Analysis.tsx` tem ~970 linhas. O `CLAUDE.md` define "Componentes: máx 300 linhas" como convenção do projeto. Vários componentes que deveriam estar em `src/features/{contracts,analysis,obligations,generator}/components/` existem como funções inline dentro das páginas (`RiskClauseCard`, `RiskScoreGauge`, `AnalysisProgress`, `ObligationCard`, `ObligationFilters`, `TemplateSelector`, `ContractWizard`, `ContractPreview`).

**Já extraí** `ContractParseStatus.tsx` e `ParsedDataSummary.tsx` (STORY-002) como prova de conceito — funcionou bem, sem regressão.

**Pergunta para @po:** vale abrir uma story de débito técnico dedicada para terminar essa extração em todas as páginas, ou seguimos extraindo incrementalmente conforme tocamos cada arquivo (como fiz até agora)?

---

## 5. `npm run typecheck` estava quebrado (já corrigido — só para registro)

Não é uma decisão pendente, mas registro aqui porque afeta a confiabilidade de tudo que reportei como "sem erros" antes de 2026-06-20: o `tsconfig.json` raiz é "solution-style" e o script rodava `tsc --noEmit` sem `-b`, o que não verificava nenhum arquivo de fato. Corrigido para `tsc -b --noEmit`. Isso revelou 16 erros reais pré-existentes (a maioria por `src/types/database.types.ts` desatualizado em relação às migrations), todos corrigidos na mesma sessão. Detalhes no Dev Agent Record da STORY-002.

---

## 6. Conformidade LGPD e accountability de segurança — gap crítico, sem story dedicada

**Levantamento feito em 2026-06-21** a pedido do Vitor sobre conformidade LGPD. Resumo (detalhe completo na nova `STORY-007-auditoria-lgpd-seguranca.md`, criada no backlog):

- **RLS de `contract_analyses`, `contract_obligations`, `clause_risks`, `contract_contents`, `generated_contracts` nunca foi auditada nem está em migration versionada** — agrava SD-001 do `SECURITY_DEBT.md`. Sem acesso ao projeto Supabase ativo não dá para confirmar se essas políticas realmente existem hoje no banco.
- **`audit_logs` existe no schema mas nunca é escrita pelo código** — gap de accountability (LGPD Art. 37).
- **Sem política de retenção de dados** dos contratos analisados (já listado em `PROJECT_REQUIREMENTS.md`, nunca endereçado).
- **Sem mecanismo de direitos do titular** (exportar/excluir dados) na tela de Configurações.
- **Sem tela de consentimento/termos de uso** no cadastro.
- O SOJ processa texto integral de contratos de terceiros (CPF, CNPJ, nomes, valores) — coloca o SOJ na posição de operador de dados pessoais de pessoas que nunca deram consentimento direto à plataforma, o que é um dos contextos mais sensíveis da LGPD.

**Por que isso é diferente dos itens 1-4 acima:** não é um trade-off de produto (estimativa vs. cálculo real, templates vs. IA) — é uma exposição de risco legal/regulatório que hoje **não tem story nenhuma no backlog**, mesmo a Fase 1 já estando substancialmente implementada e usada com dados reais.

**Pergunta para @po:** priorizar `STORY-007` (auditoria LGPD) antes ou em paralelo ao restante do backlog Fase 1? Dado que envolve dados de terceiros sem consentimento direto, recomendo tratar como prioridade alta independente do cronograma de features.

**ATUALIZADO em 2026-06-23 — auditoria executada com acesso real:** boa notícia, **a RLS está correta** em todas as tabelas (isolamento por `org_id` via `get_org_id()`, função segura `SECURITY DEFINER`). O gap de accountability (`audit_logs` nunca escrita) e a falta de versionamento das políticas em migration permanecem. Detalhe completo no Dev Agent Record da `STORY-007`.

---

## 7. `billing_history` — funcionalidade quebrada em produção (achado lateral, 2026-06-23)

Durante a auditoria de RLS, descobri que a tabela `billing_history` (usada por `src/hooks/useBillingHistory.ts`, consumida na tela de Configurações) **não existe no banco real**. A query falha, o hook não trata o erro, e a seção de faturamento simplesmente nunca mostra dados — sem erro visível para o usuário.

**Pergunta para @po:** isso é uma funcionalidade que deveria existir (criar a tabela + popular com dados reais de cobrança) ou um remanescente de mock/protótipo que pode ser removido da tela de Configurações?

---

## 8. Proteção contra senhas vazadas (HaveIBeenPwned) — bloqueada pelo plano Supabase

**Achado em 2026-06-24** via Supabase Security Advisors: a proteção nativa do Supabase Auth contra senhas comprometidas (checagem contra HaveIBeenPwned.org) está desligada. Tentei ativar via API e recebi: *"Configuring leaked password protection via HaveIBeenPwned.org is available on Pro Plans and up."*

**Pergunta para @po:** mesma categoria de decisão que `ANTHROPIC_API_KEY`/`RESEND_API_KEY` — é orçamento, não código. Vale avaliar upgrade para o plano Pro do Supabase (também resolveria outras limitações, como `db dump`/`db pull` exigirem Docker neste ambiente)?

---

## Resumo das perguntas

1. **STORY-004**: estimativa de IA é aceitável para o beta, ou cálculo financeiro real é bloqueador?
2. **STORY-005**: confirma que `RESEND_API_KEY` é o único bloqueador e está fora do meu escopo resolver?
3. **STORY-006**: personalização via Claude API entra no MVP ou fica para depois?
4. **Transversal**: abrir story de débito técnico para extração de componentes, ou seguir incremental?
5. **STORY-007 (LGPD)**: priorizar agora, em paralelo, ou aceitar o risco para o beta e tratar depois? *(RLS, audit_logs e vários achados do Security Advisor já corrigidos em 2026-06-23/24 — risco bem menor do que se pensava; retenção e direitos do titular continuam pendentes)*
6. **`billing_history`**: criar a tabela de verdade ou remover a funcionalidade morta de Configurações?
7. **Plano Supabase**: vale upgrade para Pro (desbloqueia proteção HaveIBeenPwned + ferramentas de CLI sem Docker)?
