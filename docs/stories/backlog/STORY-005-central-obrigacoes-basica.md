---
id: STORY-005
title: Central de Obrigações com Alertas
status: InProgress
type: Feature
priority: High
phase: MVP — Fase 1 (Meses 1-3)
module: Módulo 10 — Gestão de Obrigações (Parcial)
epic: Gestão de Prazos e Obrigações
created_at: 2026-06-12
author: Vitor (Piloto)
depends_on: STORY-002
estimated_effort: 6 dias
---

# STORY-005 — Central de Obrigações com Alertas

## Objetivo

Extrair automaticamente as obrigações contratuais (o que cada parte deve fazer, quando e como) e criar um sistema de alertas com antecedência de 30, 15 e 7 dias — eliminando o risco de prazo perdido que gera multa ou inadimplência.

---

## Contexto

Uma das maiores dores das PMEs com contratos é o **gerenciamento de prazos**. Renovações automáticas que passam despercebidas, multas por entrega atrasada, vencimento de vigência sem renovação negociada.

O SOJ já tem a tabela `contract_obligations` e a tela `Obligations.tsx` com dados mockados. Esta story extrai obrigações reais do contrato parseado e implementa alertas.

### Exemplos de obrigações a extrair

- "Pagamento de R$ 15.000 até o dia 10 de cada mês"
- "Entrega de relatório mensal até o 5º dia útil"
- "Renovação automática em 90 dias antes do vencimento"
- "Envio de notas fiscais em até 48h após prestação"
- "Reajuste anual pelo IPCA em Janeiro"

---

## Escopo (In)

- [x] Extração automática de obrigações via Claude Haiku ao final do parsing (`parse-contract` chama `extractObligationsFromText` em background, não bloqueante)
- [x] Para cada obrigação identificada:
  - Descrição em linguagem simples
  - Parte responsável — campo `responsible` (texto livre), não enum `contractor`/`hired`/`both` como especificado
  - Tipo: `obligation_type` presente
  - Data/periodicidade: `due_date` + `recurrence` presentes
  - Status: pendente / cumprida / atrasada (sem "não aplicável" como status distinto)
- [x] Sistema de alertas por email — `send-obligation-alerts/index.ts`: janelas de 30/15/7/0 dias implementadas; `RESEND_API_KEY` **configurada e testada em 2026-06-24** (`email_enabled: true` na resposta da função). Remetente temporariamente em `onboarding@resend.dev` (sandbox do Resend) até o domínio próprio ser verificado — ver nota abaixo
- [x] Tela `Obligations.tsx` com dados reais (via `useObligations`) e interface de gestão
- [x] Marcar obrigação como concluída manualmente (`updateObligationStatus`)
- [x] Filtros: por contrato, por status e por tipo implementados (filtro por tipo adicionado nesta sessão); filtro por data não existe na UI atual

## Fora do Escopo (Out)

- Alertas por WhatsApp/SMS — fase futura (Módulo 10 completo)
- Integração com Google Calendar / Outlook — fase futura
- Criação manual de obrigações — fase futura
- Workflow de aprovação de conclusão — fase futura

---

## Critérios de Aceitação

```
Dado que um contrato foi parseado (STORY-002)
Quando o parsing é concluído
Então o sistema automaticamente:
  - Extrai obrigações do contrato
  - Cria registros em contract_obligations
  - Agenda alertas para datas identificadas

Dado que uma obrigação tem vencimento em 30 dias
Quando o cron diário executa
Então o sistema:
  - Verifica obrigações com alertas pendentes
  - Envia email ao usuário responsável
  - Registra o envio do alerta

Dado que o usuário está na tela de Obrigações
Quando ele visualiza uma obrigação pendente
Então ele pode:
  - Ver descrição, tipo, data e responsável
  - Marcar como concluída
  - Ver histórico de alertas enviados

Dado que uma data de obrigação passou sem marcar como concluída
Então o status muda para "Atrasada" e aparece destacado em vermelho
```

---

## Tarefas Técnicas

### Edge Function: Extração de Obrigações
- [x] Integrado no fluxo de parsing — `parse-contract/index.ts` chama `extractObligationsFromText` (lógica compartilhada em `supabase/functions/_shared/extract-obligations.ts`) de forma assíncrona/best-effort
- [x] `supabase/functions/extract-obligations/index.ts` existe como endpoint standalone (reextração manual) além do trigger automático
  - Prompt Claude Haiku ✅
  - Inserir em `contract_obligations` ✅
  - Schema real difere do spec: `responsible_party` → campo é `responsible` (texto livre); `recurrence_day` não existe; status usa `pendente/cumprida/atrasada` (PT-BR) em vez de `pending/completed/overdue/not_applicable`; alertas usam `alert_sent_30/15/7/1` (não `alert_30_sent` etc.)

### Edge Function: Cron de Alertas
- [x] `supabase/functions/send-obligation-alerts/index.ts`
  - Cron diário ✅ (07h BRT, comentário no código)
  - Query por janelas 30/15/7/0 dias com alerta não enviado e status pendente ✅
  - Envio de email via Resend ✅ (testado em 2026-06-24, `RESEND_API_KEY` configurada e funcional)
  - **Limitação atual:** remetente é `onboarding@resend.dev` (sandbox), que o Resend só entrega para o email cadastrado na própria conta Resend — não para usuários reais do SOJ ainda. Bloqueia validação ponta a ponta com usuários de verdade até o domínio `soj.com.br` (ou outro) ser verificado no Resend (SPF/DKIM)
  - Marca `alert_sent_X = true` ✅
  - Marca `atrasada` quando `due_date < today` e status ainda `pendente` ✅

### Banco de Dados
- [x] Colunas em `contract_obligations` — presentes com nomenclatura diferente do spec (`responsible`, `obligation_type`, `recurrence`, `alert_sent_30/15/7/1`); `recurrence_day` e `responsible_party` (enum) não existem. Migration adicional `20260612220000_story005_obligations_source.sql` adicionou `source` (manual vs IA), não previsto no spec original.

### Frontend
- [x] `src/pages/Obligations.tsx` — dados reais via `useObligations`, sem mocks
- [x] `src/hooks/useObligations.ts` — existe e está atualizado (centralizado em `src/hooks/`, não em `features/obligations/`, seguindo a convenção atual do projeto)
- [ ] `ObligationCard.tsx` — não existe como componente separado; renderização de cada obrigação é inline em `Obligations.tsx`
- [ ] `ObligationFilters.tsx` — não existe como componente separado; filtros (status/contrato) são inline em `Obligations.tsx`
- [x] Integração Realtime — `useObligations.ts` usa subscription `postgres_changes` em `contract_obligations`

---

## Dependências

- STORY-002 concluída (contrato parseado com texto disponível)
- Email configurado: Supabase Auth emails ou Resend API
- Supabase cron habilitado (pg_cron extension)

---

## Definition of Done

- [x] `npm run typecheck` — sem erros
- [x] `npm run lint` — sem erros (6 warnings pré-existentes/aceitos, não relacionados)
- [ ] Parsing de contrato real extrai pelo menos 3 obrigações corretamente
- [ ] Email de alerta enviado 30 dias antes (testado com data artificial)
- [ ] Status "Atrasada" atribuído automaticamente após vencimento
- [ ] Tela `Obligations.tsx` exibe dados reais sem mocks
- [ ] Story atualizada para `status: Done`

---

## Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Contratos sem datas explícitas de obrigações | Alta | Médio | Obrigações sem data = tipo "recorrente sem vencimento específico" — alertar manualmente |
| Falso positivo: extração de obrigações que não são obrigações | Média | Baixo | Usuário pode remover obrigação; sistema aprende com feedback |
| Email de alerta na caixa de spam | Média | Médio | Configurar SPF/DKIM no domínio da Supabase ou Resend |

---

## Referências

- Documento Estratégico: Módulo 10 (Camada Gestão Ativa)
- `src/pages/Obligations.tsx` — tela atual (dados mockados)
- `src/hooks/useObligations.ts` — hook atual
- `src/types/database.types.ts` — schema de `contract_obligations`

---

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6 (auditoria de código existente, sem nova implementação nesta sessão)

### Completion Notes List

- O núcleo da story está implementado e funcional: extração automática de obrigações no parsing, cron de alertas com 4 janelas (30/15/7/0 dias), marcação de atraso automática, e UI com filtros básicos e marcação manual de conclusão.
- **Atualizado 2026-06-24:** `RESEND_API_KEY` configurada e testada com sucesso (`email_enabled: true`). Não é mais bloqueador. Restou apenas o gap do domínio de envio (ver Tarefas Técnicas) — sem domínio verificado, emails reais para usuários ainda não funcionam, só o sandbox.
- Desvios de nomenclatura/schema em relação ao spec original (não bloqueiam funcionalidade, mas divergem da documentação): `responsible_party` é texto livre (`responsible`) em vez de enum; status em português (`pendente/cumprida/atrasada`) em vez de inglês; sem `recurrence_day` nem status `not_applicable`.
- Componentes não foram extraídos (`ObligationCard`, `ObligationFilters`) — tudo inline em `Obligations.tsx`.
- **Implementado nesta sessão:** filtro por tipo de obrigação (`obligation_type`) em `Obligations.tsx` — antes só havia filtro por status e por contrato. As opções do filtro são geradas dinamicamente a partir dos tipos realmente presentes nas obrigações do usuário (não uma lista fixa), evitando opções vazias.
  - Filtro por data ainda não existe na UI (permanece como gap; a chip "⚡ Vencendo em 7d" cobre parcialmente esse caso de uso, mas não um range de datas arbitrário).
- Recomendação: o próximo passo para "email de alerta enviado" funcionar para usuários reais é verificar um domínio próprio no Resend (aba Domains → adicionar domínio → configurar os registros SPF/DKIM no DNS) e então trocar o remetente em `send-obligation-alerts/index.ts` de `onboarding@resend.dev` para o domínio verificado.

### File List
- `src/pages/Obligations.tsx` — adicionado filtro por tipo de obrigação (`typeFilter`, `typeOptions`, select na UI)
- `supabase/functions/send-obligation-alerts/index.ts` — remetente trocado para `onboarding@resend.dev` (sandbox), deployado e testado com `RESEND_API_KEY` real

### Change Log
| Data | Mudança | Autor |
|---|---|---|
| 2026-06-20 | Checkboxes de Escopo e Tarefas Técnicas corrigidos para refletir implementação real já existente (extract-obligations, send-obligation-alerts, Obligations.tsx, useObligations.ts) | @dev (Dex) |
| 2026-06-20 | Implementado filtro por tipo de obrigação em `Obligations.tsx`. `npm run typecheck` (agora corrigido para checar de verdade, ver STORY geral) e `npm run lint` sem novos erros. | @dev (Dex) |
| 2026-06-24 | `RESEND_API_KEY` configurada como Supabase Secret e testada com sucesso (`email_enabled: true`). Remetente trocado para sandbox do Resend até domínio próprio ser verificado. Função redeployada. | @dev (Dex) |
