# Decisões de nomenclatura e escopo — Manager

> Mapeamento entre a nomenclatura de `docs/MANAGER_SPEC.md` e o que já existe no projeto, seguindo a mesma regra já usada em `docs/billing-decisions.md`: manter os nomes existentes, registrar o mapeamento aqui. Gerado na Fase 0 (diagnóstico), em conjunto com `docs/manager-gap-report.md`.

## Mapeamento de nomes (spec → projeto real)

| Nome na spec | Nome real no projeto | Status |
|---|---|---|
| `staff_members` (tabela) + `staff_role` (enum) | 5 colunas em `users`: `is_ponderum_staff`, `can_view_dev`, `can_view_ponderum_team`, `full_platform_access`, `staff_job_title` | Não é uma tabela separada. Não existe `owner` nem `financeiro` como papel distinto — `can_view_dev` cobre Dev e Financeiro juntos. Decisão em aberto (ver gap report, seção 6, item 3). |
| `is_staff()` / `has_staff_role(r)` (funções) | Não existe função central — 12 funções `security definer` repetem a mesma checagem manualmente | A duplicação causou o achado crítico do gap report (`get_admin_dashboard()` usando `role='admin'` em vez de `is_ponderum_staff`). |
| `staff_audit_log` (tabela) | Não existe equivalente | `billing_audit_log` existe mas é só pra transição de estado de assinatura/pagamento (módulo de pagamentos), nunca ação de staff. |
| `access_overrides` (tabela) | Não existe como tabela única. Hoje: `organizations.plan_status`, `organizations.plan_id`, `organizations.blocked`, `organizations.risk_flagged`, `contract_analyses.courtesy_unlock` | Cada campo é de propósito único, sem prazo de validade, sem motivo obrigatório, sem histórico. |
| `leads` + `lead_notes` (tabelas) | `waitlist` (tabela já existente) | Schema mais simples: sem `status` de funil, sem `owner_id`, sem `consent_text_version`, sem `converted_organization_id`, sem `lead_notes`. Inserção hoje é direta da LP com a `anon` key (policy `waitlist_public_insert`), sem captcha nem rate limit — a spec pede uma Edge Function pública (`lp-lead`) nesse lugar. |
| `expenses` (tabela) | Não existe | A área Financeiro de hoje só cobre entradas (peça 9 do `PAGAMENTOS_SPEC.md`). |
| `app_errors` (tabela) | Não existe | Erros só no Sentry (serviço externo), link em `/admin`, nada consultável dentro do próprio banco. |
| `feature_flags` (tabela) | Não existe | — |
| `support_access_grants` (tabela) | Não existe | Não existe hoje nenhum mecanismo de consentimento do cliente pra acesso assistido. |
| `fiscal_invoices` (tabela) | **Já existe com esse nome exato**, criada na Fase 5c do `PAGAMENTOS_SPEC.md` (fila automática de NFS-e) | Nome igual, já é a mesma coisa. |
| `invoices` (não está na spec do manager, mas é citado em "Notas fiscais") | Tabela `invoices` já existente (upload manual de nota feito por humano da equipe, via `staff_create_invoice`) | Coexiste com `fiscal_invoices`. A aba "Notas fiscais" do app do cliente já mistura as duas origens — o manager precisa fazer o mesmo, não só ler uma das duas. |
| `manager-access`, `manager-pii`, `manager-billing`, `manager-ops`, `manager-support`, `manager-team`, `manager-export` (Edge Functions) | Nenhuma com esse nome. Equivalentes parciais espalhados: `admin-create-user`, `admin-create-staff-member`, `admin-send-invoice-email`, `admin-resend-onboarding-email`, `billing-dev-simulator`, mais as funções SQL `staff_*`/`get_admin_*`/`list_admin_*`/`list_ponderum_staff` (fazem o trabalho de `manager-access`/`manager-pii`/`manager-billing`/`manager-team` hoje, como função de banco em vez de Edge Function) | — |
| `app.ponderum.com` (domínio do app do cliente, citado na spec) | **Confirmado em 2026-11-11** (ver seção de decisões abaixo) — `app.ponderum.com` = cliente, `manager.ponderum.com` = equipe Ponderum | — |

## Decisões confirmadas (2026-11-11) — arquitetura da Fase 1

1. **Modelo de staff:** criar tabela `staff_members` real (com `staff_role` enum), migrando as 5 colunas booleanas hoje em `users` (`is_ponderum_staff`, `can_view_dev`, `can_view_ponderum_team`, `full_platform_access`, `staff_job_title`). Resolve a causa raiz da duplicação de checagem apontada no achado da seção 0 do gap report.
2. **Estrutura de código:** monorepo — um repositório Git só, com `apps/client` e `apps/manager` como projetos separados (builds/deploys independentes no Vercel), não um segundo repositório.
3. **Domínios:** `app.ponderum.com` continua sendo o app do cliente; `manager.ponderum.com` é o novo subdomínio exclusivo da equipe Ponderum.

## Achado fora do mapeamento: `get_admin_dashboard()` com checagem errada

Função existente, não mapeia pra nenhum nome da spec (é a função por trás da tela `/admin` hoje). Verifica `users.role = 'admin'` em vez de `users.is_ponderum_staff = true` — `role='admin'` é o papel que qualquer cliente ganha como dono da própria organização, não uma flag de equipe Ponderum. Detalhe completo e recomendação em `docs/manager-gap-report.md`, seção 0. Registrado aqui só para rastreabilidade — nenhuma ação tomada ainda (Fase 0 não altera código).

## Achado fora do mapeamento: possível exposição de conteúdo de contrato

Tabelas `analysis_shadow_context` e `clause_gating_shadow` (calibração interna do pipeline de IA) têm colunas de texto livre (`evidence`, `qualitative_alert`) que podem conter trecho do contrato do cliente, liberadas pra leitura de qualquer `is_ponderum_staff = true` sem checagem adicional. Precisa confirmação de conteúdo antes da Fase 1. Detalhe em `docs/manager-gap-report.md`, seção 2.

## Fase 1 — Fundação de acesso: concluída e validada em produção (2026-11-13)

Executada em 3 etapas independentes, cada uma testada antes da próxima:

**Etapa A (fundação de dados):** `staff_members` + `staff_role` enum + `staff_audit_log` + `is_staff()`/`has_staff_role()`/`log_staff_action()` substituindo as 5 colunas booleanas em `users`. Migradas **17 funções SQL + 4 policies RLS** (o levantamento real, maior que os 12 estimados no gap report) que liam essas colunas direto. As 5 colunas antigas em `users` continuam existindo (não lidas por nada — remoção fica pra Fase 5). Validado ao vivo: cadastro de staff gravando em `staff_members`, auditoria gravando em `staff_audit_log` em ações de bloqueio/desbloqueio de organização.

**Etapa B (monorepo):** root virou workspace npm (`apps/*`, `packages/*`). `apps/client` é o app atual movido (histórico git preservado), `apps/manager` é novo e mínimo (login + `StaffRoute` + placeholder), `packages/ui` (`@ponderum/ui`) compartilha `Button`/`Input`/`Label`/`SojCard`/`cn()` entre os dois — os caminhos antigos em `apps/client` viraram reexports finos, sem tocar nenhum dos ~176 arquivos consumidores. `npm install` precisou de `--legacy-peer-deps` (bug conhecido do arborist do npm 10.9 com múltiplos workspaces — não é specífico deste projeto).

**Etapa C (deploy):** projeto Vercel existente (`ponderum` → `app.ponderum.com`) com Root Directory trocado pra `apps/client`; projeto novo (`ponderum-manager` → `manager.ponderum.com`) com Root Directory `apps/manager`; DNS CNAME via Squarespace; redirect URL liberado no Supabase Auth.

**Dois bugs reais encontrados e corrigidos no caminho:**
1. O Tailwind de cada app só escaneava o próprio `src/` — as classes usadas pelos componentes de `packages/ui` nunca eram geradas, deixando inputs/botões sem nenhum estilo visível. Corrigido incluindo `../../packages/ui/src/**/*.{ts,tsx}` no `content` dos dois `tailwind.config.ts`.
2. A env var `VITE_SUPABASE_URL` no projeto `ponderum-manager` da Vercel foi salva com um caractere faltando (`...supabase.c` em vez de `...supabase.co`), bloqueado silenciosamente pelo CSP (`connect-src`) — o app mostrava "Email ou senha incorretos" genérico porque o erro de rede vira `AuthError` no supabase-js, mascarando a causa real. Diagnosticado comparando os logs de auth do Supabase (nenhuma tentativa chegando) com o console do navegador (`Refused to connect`).

Testado ao vivo em produção: login real em `manager.ponderum.com`, gate de `StaffRoute` funcionando, `app.ponderum.com` seguindo intacto depois da troca de Root Directory.
