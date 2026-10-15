# Ponderum Brownfield Enhancement PRD — Checkout Digital (Mercado Pago)

## Intro Project Analysis and Context

### Existing Project Overview

#### Analysis Source

IDE-based fresh analysis (sem `document-project` prévio rodado para este tema) + exploração direta do código e do banco de produção realizada nesta mesma sessão de trabalho.

#### Current Project State

A Ponderum (ex-SOJ — Sistema Operacional Jurídico) é uma plataforma SaaS legal-tech que analisa contratos via IA (Claude), identifica cláusulas de risco, calcula um Índice de Desequilíbrio e gera documentos jurídicos. Clientes são organizações (B2B) — não há suporte a Pessoa Física hoje. O modelo de monetização atual é manual, mas já formalizado em RPCs próprias: upgrade de Freemium para Starter (R$490/mês) começa por contato via WhatsApp com o time de vendas; a confirmação do pagamento é feita por um humano da equipe via `staff_set_org_plan_status`/`staff_renew_org_subscription` (RPCs `SECURITY DEFINER`, checam `is_ponderum_staff`), que atualizam `organizations.plan_status`/`plan_renews_at` **e já geram um registro em `billing_receipts`** a cada ativação/renovação. Ou seja, já existe um ledger de cobrança — só não existe nenhum pagamento real capturado automaticamente; toda linha em `billing_receipts` hoje representa uma confirmação manual de um humano.

### Available Documentation Analysis

Existe `docs/architecture.md`, mas está desatualizado (ainda lista `useBillingHistory.ts`, removido na limpeza pré-lançamento de 2026-07-11; não lista as Edge Functions existentes). Para este PRD, priorizei leitura direta do código e do banco em produção em vez do documento, por ser mais confiável.

- [x] Tech Stack Documentation — parcial, em `docs/architecture.md` e `CLAUDE.md`
- [x] Source Tree/Architecture — parcial, desatualizada
- [ ] Coding Standards — não formalizado em doc separado (convenções vivem em `CLAUDE.md`)
- [ ] API Documentation — não existe doc formal das Edge Functions
- [ ] External API Documentation — não existe doc do que será integrado (Mercado Pago)
- [ ] UX/UI Guidelines — não formalizado
- [ ] Technical Debt Documentation — parcial, em `docs/decisions/` e `SECURITY_DEBT.md`
- Other: nenhum

### Enhancement Scope Definition

**Enhancement Type:**
- [x] Integration with New Systems (Mercado Pago)
- [x] Major Feature Modification (substitui processo manual de upgrade/cobrança por self-service)

**Enhancement Description:** Substituir o fluxo manual de upgrade de plano (hoje: WhatsApp → negociação → ativação manual por um humano da equipe) por um checkout digital de assinatura recorrente via Mercado Pago, cobrindo a estrutura completa de planos já desenhada pelos sócios (ver peças de campanha compartilhadas em 2026-10-13) — Individual (R$199/mês), Escritório (R$499/mês), Jurídico (R$899/mês), Corporativo (R$1.749/mês), além do Teste Grátis (Freemium, já existente) — com webhook para refletir automaticamente o status/tier de pagamento em `organizations`. O plano Personalizado (sob consulta) permanece fora do checkout automatizado, como contato manual.

**Impact Assessment:**
- [x] Significant Impact (substantial existing code changes) — toca o controle de acesso central do produto (`plan_status`/`plan_id`), hoje checado em pelo menos duas Edge Functions (`parse-contract`, `analyze-contract`) e na view `contract_analyses_gated`; introduz schema novo, Edge Function nova com superfície de segurança nova (webhook público), e substitui o modelo atual de 2 tiers (Freemium/Starter) por 4 tiers pagos + Freemium + Personalizado manual.

### Goals and Background Context

**Goals:**
- Permitir que uma organização assine qualquer um dos 4 planos pagos com preço fixo (Individual, Escritório, Jurídico, Corporativo) via cartão de crédito/débito ou Pix, sem intervenção manual da equipe Ponderum
- Refletir automaticamente o tier/status de pagamento em `organizations`, respeitando os mecanismos de override já existentes (`courtesy_unlock`, `staff_set_org_blocked`)
- Eliminar o WhatsApp manual como único caminho de conversão Freemium → pago, mantendo-o só para o plano Personalizado (sob consulta, sem preço fixo)
- Manter rastreabilidade e auditabilidade de toda cobrança (nenhuma mudança de plano sem registro correspondente)
- Permitir upgrade/downgrade entre os 4 tiers pagos (ex: Individual → Jurídico) de forma self-service

**Background Context:** Hoje a Ponderum depende de um processo manual para converter clientes Freemium em pagantes: o cliente manda mensagem no WhatsApp, alguém da equipe negocia e ativa o plano manualmente mudando `plan_status` no banco, e só existe um tier pago (Starter, R$490/mês). Isso não escala e introduz atrito e atraso na conversão. Os sócios decidiram, em reunião de 2026-10-13, integrar com o Mercado Pago para viabilizar assinatura self-service — e junto com essa decisão, já desenharam uma estrutura de 6 níveis de plano (Teste Grátis, Individual, Escritório, Jurídico, Corporativo, Personalizado) com preços e limites de análises/usuários definidos, hoje usada em peças de campanha de lançamento (preço riscado + desconto + contador de 24h). **Decisão de escopo**: o checkout sempre cobra o preço final de cada plano (R$199/499/899/1.749) — a lógica de preço promocional por tempo limitado (desconto, contador) fica restrita à peça de marketing/landing page e NÃO entra como requisito funcional deste PRD. Escopo permanece sem carrinho multi-item — a venda avulsa da Biblioteca de 54 Modelos fica fora.

### Change Log

| Change | Date | Version | Description | Author |
|---|---|---|---|---|
| Criação inicial | 2026-10-13 | 0.1 | Primeira versão do PRD, a partir de discussão com o PO | Morgan (PM) |
| Revisão de escopo | 2026-10-13 | 0.2 | PO compartilhou peças de campanha dos sócios revelando estrutura real de 6 níveis de plano (não só Starter). Escopo expandido para cobrir os 4 tiers pagos com preço fixo; Personalizado permanece manual; preço promocional/campanha explicitamente fora de escopo | Morgan (PM) |
| Adição de NF-e automática | 2026-10-13 | 0.3 | PO confirmou que emissão automática de nota fiscal entra no escopo. Pesquisa técnica confirmou que o Mercado Pago NÃO emite NF-e nativamente para assinaturas — requer provedor terceiro de NF-e (a definir com a contabilidade), tratado como integração adicional e dependência em aberto | Morgan (PM) |
| Elicitação de riscos (Risk/Red Team/Critique) | 2026-10-13 | 0.4 | Adicionados FR13-15 (assinatura duplicada, autorização de criação, timing de downgrade), NFR9-11 (org não encontrada, replay de evento fora de ordem, sandbox obrigatório), e correção em CR1 (tabelas de limite por plano hardcoded precisam de entradas novas, mesmo sem mudar o contrato de leitura) | Morgan (PM) |
| Restrições técnicas + decisão de rollout | 2026-10-13 | 0.5 | Seção de restrições técnicas adicionada. PO decidiu lançamento direto para todos os clientes (sem rollout gradual), mantendo o WhatsApp como fallback, não como caminho padrão | Morgan (PM) |
| Correção: ledger de cobrança já existe | 2026-10-13 | 0.6 | Análise de código revelou que o fluxo manual já é formalizado (`staff_set_org_plan_status`/`staff_renew_org_subscription`, tabela `billing_receipts`, campo `plan_renews_at`) — não é edição direta no banco como descrito na v0.1. Corrigido Current Project State e Database Integration Strategy para reusar `billing_receipts` em vez de criar ledger paralelo; adicionado risco técnico sobre a RPC manual precisar aceitar tier, não só trial/active | Morgan (PM) |
| UI + Epic/Stories | 2026-10-13 | 0.7 | Adicionada seção de UI (reaproveita `PlanTab.tsx`, peças de campanha tratadas como marketing, não especificação de UI do app). Épico único definido com 7 stories sequenciadas por risco crescente: schema → criação de assinatura → webhook → UI → reconciliação → upgrade/downgrade → NF-e (NF-e por último por ter dependência externa em aberto, sem bloquear lançamento) | Morgan (PM) |
| Revisão final e sign-off | 2026-10-13 | 1.0 | Revisão de ponta a ponta: corrigido "5 tiers pagos" para "4" (Impact Assessment) e removida alegação indevida de que FR15 já estava confirmado. FR15 (downgrade só vale no próximo ciclo) agora formalmente confirmado pelo PO. PRD aprovado — pronto para handoff ao Scrum Master | Morgan (PM) |

---

## Requirements

### Functional

1. FR1: O usuário deve poder escolher entre os 4 planos pagos (Individual R$199, Escritório R$499, Jurídico R$899, Corporativo R$1.749) e iniciar uma assinatura recorrente via checkout hospedado/tokenizado do Mercado Pago (cartão de crédito/débito ou Pix), sem envolvimento manual da equipe Ponderum.
2. FR2: Ao aprovar o primeiro pagamento de uma assinatura, o sistema deve ativar automaticamente o plano correspondente na organização, atualizando os limites de análises/mês e usuários conforme o tier escolhido.
3. FR3: O sistema deve processar notificações webhook do Mercado Pago (tópicos `subscription_preapproval` e `subscription_authorized_payment`), validando a assinatura HMAC (header `x-signature`) antes de processar qualquer evento.
4. FR4: O processamento de webhook deve ser idempotente — reprocessar o mesmo evento (mesmo id/ação) não deve duplicar efeitos (ex: não deve re-contar um pagamento já registrado).
5. FR5: Quando uma assinatura for cancelada pelo Mercado Pago (3 pagamentos recusados consecutivos, ou cancelamento voluntário do cliente), o sistema deve rebaixar automaticamente a organização para o plano Freemium (Teste Grátis), preservando os dados existentes.
6. FR6: O usuário deve poder trocar de tier pago (upgrade ou downgrade) de forma self-service, sem precisar cancelar e recriar a assinatura manualmente (ex: Individual → Jurídico).
7. FR7: O sistema deve manter um registro histórico de cobranças/transações por organização, vinculado à assinatura do Mercado Pago — substituindo o atual "recibo" gerado localmente sem relação a pagamento real.
8. FR8: O plano Personalizado continua fora do checkout automatizado — o CTA correspondente direciona para contato manual (WhatsApp), igual ao fluxo de upgrade atual.
9. FR9: Um job periódico (cron) deve reconciliar o estado das assinaturas ativas com a API do Mercado Pago, cobrindo casos em que um webhook não chegou — nunca depender só do webhook como fonte de verdade.
10. FR10: Os mecanismos manuais já existentes (`courtesy_unlock` por análise, `staff_set_org_blocked` por organização) devem continuar funcionando sem conflito com o novo fluxo de pagamento — nenhuma automação de pagamento deve sobrescrever um bloqueio manual ativo.
11. FR11: Após a confirmação de um pagamento aprovado (primeira cobrança ou renovação mensal), o sistema deve emitir automaticamente a nota fiscal correspondente através de um provedor de emissão de NF-e com API (**provedor específico a definir com a contabilidade da Ponderum** — ex: NFe.io, eNotas, Focus NFe; o Mercado Pago não emite NF-e nativamente para assinaturas recorrentes), substituindo o processo manual atual (`uploadInvoiceForOrg`).
12. FR12: A nota fiscal emitida automaticamente deve ficar acessível ao admin da organização na mesma aba "Notas Fiscais" (`PlanTab.tsx`/`useInvoices`) já existente hoje, mantendo a experiência atual de download.
13. FR13: O sistema deve impedir a criação de mais de uma assinatura ativa simultânea para a mesma organização — idempotência na CRIAÇÃO da assinatura, não só no processamento do webhook (reaproveitando o padrão de lock atômico já usado no projeto, `UPDATE ... WHERE ... RETURNING`, usado hoje para o lock de análise em `analyze-contract`).
14. FR14: O endpoint que inicia uma nova assinatura deve validar que o usuário autenticado é admin da organização para a qual está assinando, impedindo que um usuário crie uma assinatura em nome de uma organização que não é a sua.
15. FR15: downgrade de plano no meio do ciclo entra em vigor apenas no próximo ciclo de cobrança — nunca reduz retroativamente o limite de análises de um mês já em andamento.

### Non Functional

1. NFR1: Nenhum dado de cartão deve transitar ou ser armazenado pelos servidores da Ponderum — o checkout usa exclusivamente a página/widget hospedado do Mercado Pago (tokenização), mantendo a Ponderum fora do escopo de PCI-DSS.
2. NFR2: O endpoint de webhook deve rejeitar qualquer notificação cuja assinatura HMAC não possa ser validada contra o segredo configurado, sem exceção.
3. NFR3: A ativação/alteração de plano via webhook não deve adicionar latência perceptível ao restante da aplicação, e deve responder dentro do timeout esperado pelo Mercado Pago (que reenvia em caso de falha/timeout — compatível com a idempotência exigida em FR4).
4. NFR4: Toda tabela nova relacionada a billing/assinatura deve ter RLS habilitada desde a criação, restringindo cada organização a ver só seus próprios dados de cobrança — mesmo padrão já usado em todas as tabelas do projeto.
5. NFR5: Segredos do Mercado Pago (access token, client secret do webhook) devem ser armazenados via Supabase Vault/variáveis de ambiente de Edge Function, nunca hardcoded ou expostos ao frontend.
6. NFR6: O sistema deve registrar toda mudança de `plan_status`/`plan_id` originada por webhook de pagamento, com referência ao evento do Mercado Pago que a causou, para rastreabilidade em caso de disputa ou investigação.
7. NFR7: Falha na emissão automática da nota fiscal (FR11) NÃO deve bloquear a ativação do plano nem reverter o pagamento — deve ser tratada como processo assíncrono best-effort, com alerta/log para intervenção manual de fallback, reaproveitando o fluxo manual já existente (`uploadInvoiceForOrg`) como rede de segurança.
8. NFR8: A nota fiscal emitida deve estar em conformidade com o leiaute vigente em 2026 (reforma tributária, campos IBS/CBS) — responsabilidade delegada ao provedor de NF-e escolhido; o sistema só precisa enviar os dados corretos (CNPJ/CPF do tomador, valor, descrição do serviço).
9. NFR9: O processamento de webhook deve tratar graciosamente o caso de organização não encontrada (ex: deletada por direito de exclusão LGPD) — logar e ignorar, nunca lançar erro não tratado que derrube o processamento de outros eventos.
10. NFR10: O processamento de webhook deve ignorar eventos desatualizados/fora de ordem (ex: notificação antiga reenviada depois que um estado mais recente já foi aplicado) — usar timestamp/sequência do evento do Mercado Pago, não só o id, para decidir se uma mudança deve ser aplicada. Protege contra replay de um evento antigo mas legitimamente assinado.
11. NFR11: Deve existir um ambiente de teste/sandbox do Mercado Pago configurado e validado (assinatura completa, webhook, cancelamento, reconciliação) antes de qualquer liberação em produção — critério de Definition of Done desta funcionalidade, não só requisito técnico.

### Compatibility Requirements

1. CR1: As Edge Functions existentes que checam `plan_status`/`plan_id` (`parse-contract`, `analyze-contract`) e a view `contract_analyses_gated` não devem precisar de mudança de *contrato* (shape da leitura) — mas as tabelas de limite por plano hardcoded nesses arquivos (`PLAN_MONTHLY_LIMIT` em `parse-contract/index.ts` e em `useContracts.ts`) **precisam** ganhar entradas para os novos tiers (Individual/Escritório/Jurídico/Corporativo), já que hoje só conhecem `starter`/`pro`/`enterprise`.
2. CR2: Novas tabelas/colunas de billing devem ser aditivas (novas tabelas e/ou novas colunas em `organizations`), sem remover ou renomear colunas existentes usadas por outras partes do sistema.
3. CR3: A nova tela de seleção de plano/checkout deve seguir o design system já estabelecido (dark legal-tech, tokens de cor existentes, Tailwind + shadcn/ui), sem introduzir um visual destoante.
4. CR4: A automação de pagamento não pode interferir com `courtesy_unlock` nem `staff_set_org_blocked` (ver FR10).

---

## Technical Constraints and Integration Requirements

### Existing Technology Stack

**Languages**: TypeScript strict — frontend (React) e backend (Deno, Edge Functions)
**Frameworks**: React 18 + Vite 5, Tailwind CSS v3 + shadcn/ui, TanStack Query v5, React Router v6
**Database**: Supabase Postgres — RLS habilitada em todas as tabelas hoje, padrão a manter
**Infrastructure**: Vercel (frontend), Supabase Edge Functions/Deno (backend), Supabase Storage, Supabase Auth, `pg_cron` + Supabase Vault para jobs agendados (padrão já usado em `resume-stuck-analyses`)
**External Dependencies**: Anthropic Claude API (análise de contratos), Cloudmersive (scan de antivírus) — e, com este PRD, Mercado Pago (pagamentos) + provedor de NF-e a definir (FR11)

### Integration Approach

**Database Integration Strategy**: Já existe um ledger de cobrança (`billing_receipts`, hoje alimentado manualmente por `staff_set_org_plan_status`/`staff_renew_org_subscription`) e um campo de renovação (`organizations.plan_renews_at`) — por princípio de reuso (preferir adaptar o que já existe a criar do zero), o webhook automatizado deve **gerar linhas em `billing_receipts`** da mesma forma que as RPCs manuais já fazem hoje, em vez de criar um ledger paralelo. Além disso, é necessária uma tabela nova ligando `organizations.id` ao `subscription_id`/`customer_id` do Mercado Pago, e um registro do `payment_id`/`event_id` de cada webhook já processado (base da idempotência exigida em FR4 — antes de aplicar um evento nunca antes visto, checar que ele não foi processado). `organizations.plan_id` ganha novos valores possíveis para os 4 tiers pagos. Nomenclatura exata das tabelas/colunas novas fica para a fase de design técnico (@architect/@data-engineer), não é fixada neste PRD — mas a reutilização de `billing_receipts`/`plan_renews_at` é uma decisão de integração que já pode ser fixada aqui. Toda tabela nova nasce com RLS desde o primeiro migration (NFR4), incluindo o cuidado com `security_invoker` em views que a sirvam (classe de bug real já corrigida nesta mesma sessão em `contract_analyses_gated`).

**API Integration Strategy**: Edge Function nova para criar assinatura — autenticada via JWT normal do Supabase (não via segredo de cron), valida que o usuário é admin da organização (FR14) e aplica lock atômico contra assinatura duplicada (FR13). Edge Function nova para receber webhook do Mercado Pago — deployada com `--no-verify-jwt` (mesmo padrão já usado em `resume-stuck-analyses`, já que o Mercado Pago não envia JWT do Supabase); autenticidade vem exclusivamente da validação HMAC exigida em NFR2. Job periódico de reconciliação (FR9) reaproveita o padrão já estabelecido de `pg_cron` + `net.http_post` + segredo lido do Supabase Vault.

**Frontend Integration Strategy**: Nova seção de seleção de plano em `Settings`/`PlanTab.tsx` (ou rota dedicada), redirecionando para o checkout hospedado do Mercado Pago — reaproveita o design system existente (CR3). `src/lib/pricing.ts` precisa crescer de 1 tier pago para 4 — o comentário atual no arquivo ("único lugar que precisa mudar quando o preço mudar") parte da premissa de um plano só; isso exige refatoração para um mapa de tiers, não apenas novas constantes soltas.

**Testing Integration Strategy**: Sandbox do Mercado Pago (NFR11) para validar o ciclo completo antes de produção. Testes manuais dirigidos por cenário, no mesmo espírito do que foi feito nesta sessão para validar o watchdog de Fase B: forçar webhook duplicado, forçar evento fora de ordem, forçar falha de emissão de NF-e, simular as 3 recusas de pagamento até o cancelamento automático.

### Code Organization and Standards

**File Structure Approach**: Novas Edge Functions em `supabase/functions/<nome>/index.ts`, seguindo a mesma estrutura das existentes (CORS, `jsonResponse` helper, `serviceClient`/`userClient`).
**Naming Conventions**: Seguir as já em uso — snake_case no banco, camelCase no TypeScript.
**Coding Standards**: TypeScript strict; Zod validando o payload do webhook do Mercado Pago antes de processar qualquer evento (reforça a regra "Segurança não é opcional, Zod em todas as fronteiras" do `CLAUDE.md`).
**Documentation Standards**: `docs/architecture.md` está desatualizado hoje (não lista nenhuma Edge Function existente) — atualizá-lo para incluir as novas functions de pagamento é dívida a resolver, não bloqueador deste PRD.

### Deployment and Operations

**Build Process Integration**: Sem mudança — Vercel para o frontend, `supabase functions deploy` para as Edge Functions (mesmo fluxo usado ao longo desta sessão).
**Deployment Strategy**: Deploy incremental por Edge Function, com confirmação explícita do usuário antes de cada deploy — nunca deploy automático de código de pagamento sem revisão.
**Monitoring and Logging**: Reaproveitar o Sentry já configurado (visível no Painel Dev) para captura de erro; logs do webhook devem incluir o `event_id` do Mercado Pago para correlação com disputas/investigações (NFR6).
**Configuration Management**: Segredos (`MERCADOPAGO_ACCESS_TOKEN`, segredo de validação do webhook, e o do provedor de NF-e) via Supabase Vault/variáveis de ambiente de Edge Function — nunca no frontend, nunca hardcoded (NFR5).

### Risk Assessment and Mitigation

**Technical Risks**: A idempotência do webhook e o lock contra assinatura duplicada são as partes de maior risco de implementação — um erro aqui gera cobrança duplicada ou plano pago não ativado, os dois piores cenários possíveis para esta funcionalidade. Adicionalmente: `staff_set_org_plan_status` (RPC manual hoje usada pela equipe) só aceita `p_status in ('trial', 'active')` — binário, sem noção de tier. Com 4 planos pagos, essa RPC manual (que continua existindo como via de suporte/exceção) também precisa ser estendida para aceitar um tier específico, não só ligar/desligar "ativo". Isso não é opcional: sem essa extensão, a equipe perde a capacidade de dar suporte manual a um cliente específico depois que o checkout for lançado.
**Integration Risks**: Dependência de um segundo provedor externo (NF-e) ainda não escolhido pode atrasar FR11/FR12 mesmo com o checkout pronto — mitigado por design (NFR7: falha de NF-e nunca bloqueia o pagamento).
**Deployment Risks**: Esta é a primeira vez que o projeto expõe um endpoint público de webhook de pagamento — superfície de ataque nova para o sistema. Mitigado por NFR2 (validação HMAC obrigatória, sem exceção) e NFR10 (proteção contra replay de evento fora de ordem).
**Mitigation Strategies**: Sandbox completo antes de produção (NFR11). **Decisão do PO (2026-10-13)**: lançamento direto para todos os clientes, sem rollout gradual — base de usuários ainda pequena e os sócios priorizam a transição rápida para o novo fluxo. O WhatsApp manual continua disponível como *fallback* (ex: plano Personalizado, ou um cliente com dificuldade no checkout), mas não é mais o caminho padrão de conversão assim que o checkout for liberado.

---

## User Interface Enhancement Goals

### Integration with Existing UI

A tela de seleção de plano já existe hoje (`PlanTab.tsx`, dentro de Configurações), estruturada em torno de um objeto `PLAN_INFO` com nome/cor/preço/features por tier, renderizado em card — esse padrão se estende naturalmente para os 5 tiers (Freemium + 4 pagos), sem precisar de um componente novo do zero. As peças de campanha compartilhadas pelos sócios (fundo escuro, foto de ambiente jurídico, preço riscado) são material de **marketing/landing page** — a tela dentro do app segue o design system já estabelecido da Ponderum (tokens HSL em `index.css`, `--primary` verde `#00e5a0`, Tailwind + shadcn/ui), não a arte da campanha. O "preço riscado + desconto + contador" da campanha fica fora do app (ver decisão de escopo da Seção de Requirements).

### Modified/New Screens and Views

- `src/components/settings/PlanTab.tsx` — expandir de 1 plano pago exibido para os 4 tiers pagos + Freemium + Personalizado, com CTA diferente por tier: "Assinar" (inicia checkout do Mercado Pago) para os 4 pagos, "Fale com a Ponderum" (WhatsApp, como já existe) para o Personalizado.
- Tela/estado novo de retorno do checkout (sucesso, pendente, falha) — o Mercado Pago redireciona de volta ao app após o pagamento; o estado "pendente" é relevante porque o webhook pode chegar depois do redirect (ver NFR3).
- Nenhuma outra tela do produto muda — análise de contrato, obrigações, geração de documentos permanecem como estão.

### UI Consistency Requirements

- Cards de plano seguem a mesma estrutura visual já usada em `PLAN_INFO`/`FREEMIUM_INFO` (nome, cor de destaque, preço, lista de features) — sem introduzir um padrão visual novo.
- O estado "pendente" pós-checkout deve deixar claro ao usuário que o pagamento está em processamento e pode levar alguns instantes para refletir — nunca dar a entender que algo falhou quando é só o webhook ainda não ter chegado.

---

## Epic and Story Structure

### Epic Approach

**Epic Structure Decision**: Épico único (não múltiplos épicos) — todo este trabalho converge para um único objetivo coeso (substituir o processo manual de upgrade por checkout self-service via Mercado Pago) e as partes (schema, criação de assinatura, webhook, UI, reconciliação, NF-e) são interdependentes, não melhorias não-relacionadas entre si. Sequenciado em 7 stories incrementais: começa pelo schema (menor risco, zero impacto visível), passa pelas duas Edge Functions mais sensíveis (criação de assinatura, depois webhook — testáveis isoladamente em sandbox antes de qualquer UI existir), só então a UI (maior visibilidade, depende de tudo anterior já validado), e termina com reconciliação, upgrade/downgrade self-service e NF-e (que tem dependência externa em aberto e por isso fica por último, sem bloquear o lançamento do checkout em si — NFR7 garante que isso é seguro).

---

## Epic 1: Checkout Digital de Assinatura (Mercado Pago)

**Epic Goal**: Substituir o processo manual de upgrade/cobrança por um checkout digital de assinatura recorrente via Mercado Pago, cobrindo os 4 planos pagos (Individual, Escritório, Jurídico, Corporativo), com ativação automática de plano, idempotência/reconciliação robustas, e emissão automática de nota fiscal.

**Integration Requirements**: Reutilizar `plan_status`/`plan_id` nas Edge Functions e views já existentes sem quebrar o contrato de leitura (CR1); reutilizar `billing_receipts`/`plan_renews_at` como ledger (em vez de criar um paralelo); preservar `courtesy_unlock`/`staff_set_org_blocked` (FR10/CR4); seguir o padrão de cron + Supabase Vault já estabelecido (`resume-stuck-analyses`).

### Story 1.1 Schema de assinatura e extensão do suporte manual existente

Como administrador do sistema (equipe Ponderum),
Eu quero que o banco de dados tenha as tabelas/colunas necessárias para rastrear assinaturas do Mercado Pago por organização, e que a RPC manual existente aceite um tier específico,
Para que o restante do épico tenha uma base de dados sólida, e a equipe não perca a capacidade de suporte manual durante a transição.

**Acceptance Criteria**
1. Nova tabela (nome a definir em design técnico) liga `organizations.id` a `subscription_id`/`customer_id` do Mercado Pago, com RLS restringindo cada organização a ver só a própria linha.
2. Nova tabela/coluna registra o `event_id`/`payment_id` de cada webhook já processado, usada como base de idempotência.
3. `organizations.plan_id` aceita os novos valores (`individual`, `escritorio`, `juridico`, `corporativo`), mantendo `starter` funcional para organizações existentes.
4. `staff_set_org_plan_status` é estendida para aceitar um parâmetro de tier, preservando compatibilidade com chamadas existentes.
5. Todas as tabelas/colunas novas têm RLS habilitada e testada antes do merge.

**Integration Verification**
- IV1: Organizações existentes com `plan_id='starter'` continuam funcionando sem nenhuma mudança de comportamento após a migration.
- IV2: `contract_analyses_gated` e as Edge Functions que leem `plan_status`/`plan_id` continuam retornando os mesmos resultados para dados existentes.
- IV3: A RPC `staff_set_org_plan_status`, chamada do jeito que é chamada hoje (sem o novo parâmetro), continua funcionando como antes.

`executor: @data-engineer` · `quality_gate: @dev` · `quality_gate_tools: [schema_validation, migration_review, rls_test]`

### Story 1.2 Edge Function de criação de assinatura

Como usuário admin de uma organização,
Eu quero iniciar uma assinatura de um dos 4 planos pagos a partir do app,
Para que eu consiga assinar a Ponderum sem precisar falar com o time de vendas.

**Acceptance Criteria**
1. Nova Edge Function cria uma `preapproval` no Mercado Pago para o plano escolhido, autenticada via JWT do usuário.
2. A function valida que o usuário é admin da organização antes de criar a assinatura (FR14).
3. A function impede criar uma segunda assinatura ativa se a organização já tiver uma (FR13), usando lock atômico.
4. A function retorna a URL de checkout hospedado do Mercado Pago para o frontend redirecionar o usuário.
5. Testado em sandbox do Mercado Pago com os 4 planos.

**Integration Verification**
- IV1: Usuários sem permissão de admin na organização recebem erro de autorização, sem conseguir criar assinatura.
- IV2: Tentar criar uma segunda assinatura para a mesma organização falha de forma clara, sem duplicar nada no banco.
- IV3: Nenhuma mudança no comportamento de upload/análise de contrato existente.

`executor: @dev` · `quality_gate: @architect` · `quality_gate_tools: [security_scan, auth_review]`

### Story 1.3 Edge Function de webhook do Mercado Pago

Como sistema,
Eu quero processar notificações webhook do Mercado Pago de forma segura e idempotente,
Para que o plano da organização seja ativado automaticamente assim que um pagamento for aprovado, sem risco de duplicar cobrança ou aplicar eventos antigos fora de ordem.

**Acceptance Criteria**
1. Edge Function nova (`--no-verify-jwt`) valida a assinatura HMAC (`x-signature`) de toda notificação recebida antes de processar (NFR2).
2. Eventos já processados (mesmo `event_id`) são ignorados, sem reaplicar efeito (FR4).
3. Eventos fora de ordem/mais antigos que o estado já aplicado são ignorados (NFR10).
4. Pagamento aprovado ativa automaticamente o plano correspondente na organização e gera um registro em `billing_receipts` (FR2, reuso do ledger existente).
5. Assinatura cancelada (3 falhas ou cancelamento voluntário) rebaixa a organização para Freemium (FR5).
6. Organização não encontrada (ex: deletada) é logada e ignorada, sem quebrar o processamento de outros eventos (NFR9).
7. Testado em sandbox: webhook duplicado, webhook fora de ordem, 3 falhas consecutivas simuladas, cancelamento voluntário.

**Integration Verification**
- IV1: `courtesy_unlock` e `staff_set_org_blocked` continuam funcionando sem serem sobrescritos por um evento de webhook (FR10/CR4).
- IV2: Uma organização nunca fica com duas linhas de assinatura ativa simultânea, mesmo sob eventos concorrentes.
- IV3: O tempo de resposta do webhook fica dentro do esperado pelo Mercado Pago, sem causar reenvio desnecessário.

`executor: @dev` · `quality_gate: @architect` · `quality_gate_tools: [security_scan, webhook_signature_validation, idempotency_test]`

### Story 1.4 UI de seleção de plano e checkout

Como usuário admin de uma organização,
Eu quero ver os planos disponíveis e assinar um deles diretamente pela tela de Configurações,
Para que eu consiga fazer upgrade sem sair do app ou falar com vendas.

**Acceptance Criteria**
1. `PlanTab.tsx` exibe os 5 tiers (Freemium + 4 pagos), reaproveitando o padrão visual de cards já existente.
2. Cada plano pago tem um CTA "Assinar" que chama a Edge Function de criação de assinatura (Story 1.2) e redireciona para o checkout do Mercado Pago.
3. O plano Personalizado mantém o CTA "Fale com a Ponderum" (WhatsApp), igual ao fluxo atual.
4. Após o retorno do checkout, o usuário vê um estado de "pagamento em processamento" caso o webhook ainda não tenha sido aplicado, nunca uma mensagem de erro falsa.
5. Segue o design system existente (CR3) — nenhum elemento visual novo fora dos tokens já definidos.

**Integration Verification**
- IV1: A tela de Configurações continua funcionando normalmente para organizações que não interagem com o novo fluxo de checkout.
- IV2: Nenhuma regressão nas abas existentes de Recibos/Notas Fiscais.
- IV3: Testado em mobile e desktop, mantendo a responsividade já existente no restante do app.

`executor: @ux-design-expert` · `quality_gate: @dev` · `quality_gate_tools: [accessibility_check, responsive_test]`

### Story 1.5 Job de reconciliação periódica

Como sistema,
Eu quero conferir periodicamente o estado das assinaturas ativas contra a API do Mercado Pago,
Para que nenhuma mudança de pagamento fique perdida caso um webhook nunca chegue (FR9).

**Acceptance Criteria**
1. Novo cron job (`pg_cron` + `net.http_post` + segredo via Supabase Vault, mesmo padrão de `resume-stuck-analyses`) roda periodicamente.
2. Para cada assinatura ativa, confere o status real na API do Mercado Pago e corrige qualquer divergência com o que está em `organizations`.
3. Divergências corrigidas são logadas para auditoria.
4. Testado isoladamente (mesmo procedimento usado para validar o watchdog de Fase B nesta sessão): forçar uma divergência manual e confirmar que o cron corrige.

**Integration Verification**
- IV1: O job não interfere com o watchdog existente (`resume-stuck-analyses`) nem com nenhum outro cron já agendado.
- IV2: Rodar o job repetidas vezes sem nenhuma divergência real não causa nenhum efeito colateral (idempotente).
- IV3: Nenhum impacto de performance perceptível no restante do sistema durante a execução do job.

`executor: @dev` · `quality_gate: @architect` · `quality_gate_tools: [cron_review, idempotency_test]`

### Story 1.6 Upgrade/downgrade self-service entre tiers pagos

Como usuário admin de uma organização já assinante,
Eu quero trocar de um plano pago para outro diretamente pelo app,
Para que eu consiga ajustar minha assinatura conforme a necessidade muda, sem precisar cancelar e recriar.

**Acceptance Criteria**
1. Usuário consegue solicitar troca de tier (ex: Individual → Jurídico) a partir da tela de plano.
2. Upgrade aplica o novo limite imediatamente.
3. Downgrade só entra em vigor no próximo ciclo de cobrança, nunca reduzindo retroativamente o limite do mês em andamento (FR15 — confirmado pelo PO em 2026-10-13).
4. Testado em sandbox para os dois sentidos (upgrade e downgrade).

**Integration Verification**
- IV1: Uma organização no meio de uma troca de tier nunca fica sem plano/com `plan_status` inconsistente.
- IV2: O histórico em `billing_receipts` reflete corretamente a mudança de tier.
- IV3: Nenhuma interferência com análises já em andamento no momento da troca.

`executor: @dev` · `quality_gate: @architect` · `quality_gate_tools: [state_machine_review]`

### Story 1.7 Emissão automática de nota fiscal

Como usuário admin de uma organização,
Eu quero receber automaticamente a nota fiscal de cada pagamento aprovado,
Para que eu não precise esperar o time da Ponderum subir manualmente a NF-e.

**Acceptance Criteria**
1. Após pagamento aprovado (primeira cobrança ou renovação), o sistema chama a API do provedor de NF-e escolhido (dependência externa — ver FR11) para emitir a nota.
2. Falha na emissão não bloqueia a ativação do plano nem reverte o pagamento (NFR7) — fica registrada para emissão manual de fallback via `uploadInvoiceForOrg`.
3. Nota emitida automaticamente aparece na aba "Notas Fiscais" existente, mesma experiência de download de hoje (FR12).
4. Conformidade com o leiaute vigente em 2026 (IBS/CBS) delegada ao provedor escolhido (NFR8).

**Integration Verification**
- IV1: O fluxo manual de upload de NF-e (`uploadInvoiceForOrg`) continua funcionando normalmente como fallback.
- IV2: Nenhuma mudança na estrutura da tabela `invoices` que quebre leituras existentes.
- IV3: Testado com o provedor escolhido em ambiente de teste antes de produção.

`executor: @dev` · `quality_gate: @pm` · `quality_gate_tools: [vendor_integration_review]`

> **Nota**: esta story tem uma dependência externa em aberto (escolha do provedor de NF-e, FR11). Pode ser sequenciada em paralelo às demais assim que o provedor for decidido, sem bloquear o lançamento do checkout — NFR7 garante que a ausência de NF-e automática não impede a assinatura de funcionar.

---

## Story Manager Handoff

Por favor desenvolva stories detalhadas para este épico brownfield. Considerações-chave:

- Esta é uma melhoria a um sistema existente rodando React 18 + Vite 5 + TypeScript + Supabase (Postgres/Auth/Storage/Edge Functions/Realtime) + Vercel.
- Pontos de integração: `organizations.plan_id`/`plan_status`/`plan_renews_at`, `billing_receipts`, `staff_set_org_plan_status`/`staff_renew_org_subscription`, `contract_analyses_gated`, Edge Functions `parse-contract`/`analyze-contract`, padrão de cron já estabelecido em `resume-stuck-analyses`.
- Padrões existentes a seguir: lock atômico via `UPDATE ... WHERE ... RETURNING`, RLS em toda tabela nova, segredos via Supabase Vault, confirmação explícita do usuário antes de cada deploy.
- Requisitos de compatibilidade críticos: CR1-CR4 (ver seção Requirements) — `courtesy_unlock`/`staff_set_org_blocked` não podem ser quebrados por nenhuma story deste épico.
- Cada story deve incluir verificação de que a funcionalidade existente permanece intacta (ver Integration Verification de cada uma).

O épico deve manter a integridade do sistema existente enquanto entrega checkout digital de assinatura via Mercado Pago, cobrindo os 4 tiers pagos com ativação automática, reconciliação robusta e emissão de nota fiscal.
