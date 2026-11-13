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

## Fase 1b — MFA obrigatório: expandido para todo usuário do app.ponderum.com (2026-11-13)

Escopo original da Fase 1b era MFA (TOTP) só pra staff, nas 3 telas staff-only do `apps/client` (`Admin`, `AdminFinance`, `PonderumTeam`) e em todo o `apps/manager`. Durante o teste ao vivo, o Vitor decidiu expandir: MFA passa a ser obrigatório pra **qualquer usuário logado em `app.ponderum.com`**, cliente pagante incluído, verificado logo após o login — não só em telas específicas.

**Mudança de desenho:** o gate de `aal2` saiu das 3 páginas staff-only e foi pro `ProtectedRoute` compartilhado do `apps/client`, cobrindo qualquer rota logada de uma vez. `useRequireStaffMfa.ts` (específico de staff) foi removido; as 3 páginas voltaram ao gate original de permissão (`canViewDev`/`canViewPonderumTeam`), já que o `aal2` passa a estar garantido antes de chegar nelas.

**Códigos de backup (`auth.mfa.recoveryCodes`):** com MFA valendo pra toda a base de clientes (não só 3 pessoas), o reset manual via staff não escala — vira ticket de suporte a cada celular perdido. Implementado o passo de geração de códigos de backup no enroll dos dois apps. **Achado:** esse recurso está desabilitado no projeto Supabase (confirmado via log de auth: `422 mfa_recovery_codes_enroll_not_enabled`) — não existe toggle no dashboard pra isso, só o opt-in `experimental: { recoveryCodes: true }` no client, que sozinho não é suficiente. O código já está pronto e tenta gerar os códigos normalmente; se falhar (como falha hoje), segue direto pro destino sem travar o enroll, e a opção "usar código de backup" fica escondida no challenge (checagem via `recoveryCodes.getStatus()`) até a Supabase habilitar o recurso no servidor. Pendência: pedir habilitação à Supabase ou aguardar disponibilidade.

**Botão "Preciso de ajuda com o acesso":** adicionado no login e nas telas de MFA do `apps/client`, abrindo WhatsApp de suporte (mesmo número/padrão de `SupportButton`, extraído pra `src/lib/supportWhatsapp.ts`) com mensagem pré-preenchida. Não faz sentido no `apps/manager` — lá quem usa é a própria equipe interna; a saída pra MFA perdido continua sendo o reset manual entre colegas com papel `dev` (`admin-reset-staff-mfa`, já existente).

**Rollout:** a migration que exige `aal2` em `is_staff()`/`has_staff_role()` (`20261113000000_manager_enforce_mfa_aal2.sql`) continua **não aplicada** — só 1 dos 3 staff reais tinha feito o enroll no momento do deploy. Aplicar cedo demais trancaria os outros 2 fora de tudo, sem conseguir nem abrir a tela de enroll. Fica pendente até confirmar `verified` em `auth.mfa_factors` pros 3.

**Bug real encontrado no deploy (monorepo):** depois do push, `apps/client` passou a falhar o build no Vercel (`app.ponderum.com` ficou preso na última versão bem-sucedida, de 20/out, por mais de 24h sem ninguém notar). Causa: `apps/client/package.json` dependia do hoisting do `npm install` da raiz do monorepo pra resolver `vite`, `@vitejs/plugin-react-swc`, `typescript`, `tailwindcss`, `autoprefixer`, `postcss`, `react`, `react-dom`, `zod`, `clsx`, `tailwind-merge` e `@supabase/supabase-js` — funciona no install local (raiz inteira), mas o install isolado por workspace que o Vercel faz por app não inclui dependências que só existem no `package.json` da raiz. `apps/manager` nunca teve esse problema porque já foi criado declarando todas as suas próprias dependências explicitamente. Corrigido replicando esse padrão em `apps/client` — cada app do monorepo deve declarar tudo que importa, sem depender de hoisting da raiz.

Testado ao vivo em produção: login em `app.ponderum.com` caindo direto no enroll de MFA antes do Dashboard; `manager.ponderum.com` sem regressão (challenge funcionando, Home carregando).

## Fase 2a — Migração da área Equipe Ponderum pro apps/manager

Primeira etapa da Fase 2 (seção 6 do `docs/MANAGER_SPEC.md`): mover as 3 áreas internas (Dev, Equipe, Financeiro) de dentro do `apps/client` pro `apps/manager`. Dado o tamanho da spec completa (tabelas novas como `leads`, `expenses`, `feature_flags`, `access_overrides` que ainda não existem), o Vitor escolheu dividir por área, mesmo padrão das Etapas A/B/C da Fase 1 — esta etapa migra só a **Equipe Ponderum**.

**Papéis confirmados com o Vitor** (relevante pra quando migrarmos a área Financeiro): Gabriel Kober (CFO) → `financeiro`, Vitor (CTO) → `dev`, Fellipe (CEO) → `financeiro`. Os 3 têm acesso à área Equipe.

**Achado que simplificou o escopo:** as RPCs que a área Equipe usa (`list_staff_organizations`, `staff_set_org_plan_status`, `staff_set_org_blocked`, `staff_renew_org_subscription`, `get_executive_dashboard`, `staff_set_courtesy_unlock`, `list_staff_contracts`) já checam `has_staff_role('equipe')` internamente desde a Etapa A da Fase 1 — a segurança de verdade já estava correta no banco; faltava só mover a apresentação (frontend).

**O que moveu** (`git mv`, preservando histórico): `PonderumTeam.tsx` (`apps/client/src/pages/`) → `Equipe.tsx` (`apps/manager/src/pages/`, rota `/equipe`); `ExecutiveDashboard.tsx`, `CreateStarterUserForm.tsx`, `OrganizationsManagementList.tsx`, `UploadInvoiceModal.tsx` (de `apps/client/src/components/admin/` pra `apps/manager/src/components/equipe/`); os 3 componentes shadcn que esses arquivos usavam e ainda não estavam em `@ponderum/ui` (`Switch`, `DropdownMenu`, `Dialog`) — os caminhos antigos em `apps/client` viraram reexports finos, mesmo padrão já usado na Etapa B pra Button/Input/Label/SojCard.

**O que foi copiado** (não movido, porque o client ainda usa): `lib/adminDashboard.ts` e `lib/brazilianDocs.ts` — cópias enxutas (só o que a área Equipe usa) em `apps/manager/src/lib/`. A função `uploadInvoiceForOrg` (antes dentro de `hooks/useInvoices.ts`, que também serve a aba "Notas fiscais" do cliente comum) foi extraída pra `apps/manager/src/lib/uploadInvoice.ts` e removida do client (não tinha mais nenhum chamador lá).

**Infraestrutura nova no manager:** `useStaffRoles.ts` (mesma leitura de `staff_members.roles` do `usePonderumPermissions` do client, devolvendo `canViewEquipe`), `RequireRole.tsx` (gate de papel específico, aninhado dentro de `StaffRoute` que já garante sessão + `is_staff()` + `aal2`), `ManagerLayout.tsx` (primeira sidebar do manager — antes a Home renderizava sozinha, sem navegação nenhuma). O `apps/manager/src/lib/supabase.ts` ganhou tipagem `Database` (copiada de `apps/client/src/types/database.types.ts`) — o comentário que já estava lá desde a Fase 1 dizia "tipagem completa entra quando as áreas de verdade migrarem", que é exatamente agora.

**Lição do bug de deploy de hoje, já aplicada aqui:** `packages/ui/package.json` ganhou `@radix-ui/react-switch`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-dialog` e `lucide-react` como dependencies próprias (não só hoisting do root) — mesma causa raiz do bug corrigido na Fase 1b, evitada de propósito desta vez.

**O que saiu do `apps/client`:** rota `/equipe-ponderum` e o lazy import de `PonderumTeam`; o item "Equipe Ponderum" do `AppSidebar.tsx`; o botão "Equipe Ponderum" do menu mobile (`StaffMenuDropdown` em `AppLayout.tsx`). `/equipe-ponderum` agora dá 404 (nunca redireciona pro manager, como a spec pede). **Não mexido:** `usePonderumPermissions.ts` e `PonderumStaffManagement.tsx` continuam com `canViewPonderumTeam` — é o campo que concede o papel `equipe` a alguém, parte da gestão de time (Dev area, migra numa etapa futura).

Testado localmente: `npm run typecheck`/`lint`/`build` limpos nos dois apps; bundle de produção do `apps/client` sem nenhum resquício da página/rota Equipe (só sobra `canViewPonderumTeam` como nome de campo em `PonderumStaffManagement.tsx`, esperado).

## Fase 2b — Migração da área Dev pro apps/manager

Terceira etapa da Fase 2: `apps/client/src/pages/Admin.tsx` (rota `/admin`) e os componentes que ela renderiza migram pro `apps/manager` (rota `/dev`, gated por `has_staff_role('dev')`).

**Dois achados corrigidos durante a migração:**

1. **`get_admin_dashboard()` só checava `is_staff()` no banco, não `has_staff_role('dev')`** — qualquer staff (mesmo só com papel `equipe`/`financeiro`) conseguiria chamar essa RPC direto (ex.: via console do navegador), mesmo sem ver a tela. Falha pré-existente da Etapa A, não introduzida agora. Apertado via migration (`20261113010000_manager_tighten_get_admin_dashboard.sql`) — mesma função, só trocou `is_staff()` por `has_staff_role('dev')` no gate inicial.
2. **`RecentActivityFeed` (lista de contratos recentes) chamava `list_staff_contracts`/`staff_set_courtesy_unlock`, que já exigiam papel `equipe`** desde a Etapa A — mas vivia dentro da página Dev. Nunca quebrou porque os 3 staff reais têm `equipe` também. Corrigido movendo o componente pra página Equipe (`apps/manager/src/pages/Equipe.tsx`), onde seu backend já pertencia de verdade — sem mexer em RPC nenhuma.

**O que moveu** (`git mv`): `StatsGrid`, `AnalysesChart`, `CronHealthCard`, `WaitlistTable`, `OrganizationsTable`, `FeedbacksList`, `PonderumStaffManagement`, `SupportChannelCard`, `BillingDevSimulator`, `ChargebacksCard` → `apps/manager/src/components/dev/`; `RecentActivityFeed` → `apps/manager/src/components/equipe/`; `Admin.tsx` → `apps/manager/src/pages/Dev.tsx` (gate interno removido, `RequireRole("dev")` já cobre).

**Achado no meio da migração:** `ChargebacksCard` também é usado por `apps/client/src/pages/AdminFinance.tsx` (área Financeiro, ainda não migrada — Fase 2c futura). Como `git mv` move (não copia), isso quebrou o typecheck do client. Corrigido restaurando uma cópia de `ChargebacksCard.tsx` em `apps/client/src/components/admin/` (conteúdo original, sem alteração) — fica duplicado de propósito até a Fase 2c migrar o Financeiro também, quando aí sim a cópia do client pode sair.

**O que foi substituído/criado:** `apps/manager/src/lib/adminDashboard.ts` passou da versão enxuta da Fase 2a (só `aiCostBRL`/`fmtBRL`) pra cópia completa do arquivo do client (a Dev area usa `Stats`, `WaitlistEntry`, `Feedback`, `Org`, `DayCount`, `CronJob`, `PLAN_LABEL`, `CAT_LABEL`, `STATUS_LABEL`, `fmtDate`, `estimatedCostBRL`). `apps/manager/src/lib/edgeFunctionError.ts` (novo, cópia do client, usado pelo `BillingDevSimulator`). `useStaffRoles.ts` ganhou `canViewDev`. `ManagerLayout.tsx` ganhou o item "Dev" no sidebar.

**O que saiu do `apps/client`:** rota `/admin` + lazy import; item "Dev" do `AppSidebar.tsx` (o de `/financeiro`, que também usa `canViewDev` hoje, continua intacto — só migra na Fase 2c). **O mecanismo inteiro do `StaffMenuDropdown`/ícone "Acesso interno" em `AppLayout.tsx` foi removido** — depois que Dev saiu, não sobrava nenhum botão dentro dele (Equipe já tinha saído na 2a; Financeiro nunca teve entrada nesse menu mobile). `/admin` agora dá 404.

Testado localmente: `npm run typecheck`/`lint`/`build` limpos nos dois apps; bundle do `apps/client` sem nenhum resquício da página Dev.

## Fase 2c — Migração da área Financeiro pro apps/manager (fecha a Fase 2)

Última etapa da Fase 2: `apps/client/src/pages/AdminFinance.tsx` (rota `/financeiro`) migra pro `apps/manager` (rota `/financeiro`, gated por `has_staff_role('financeiro')` de verdade).

**Mesmo achado das duas etapas anteriores, desta vez com impacto real de acesso:** `get_admin_finance_summary()` e `list_admin_payments()` só checavam `is_staff()`, não `has_staff_role('financeiro')`. Pior: o gate no front era `canViewDev` (herdado de quando a tela nasceu dentro do bloco Dev) — ou seja, **nem o Gabriel (CFO) nem o Fellipe (CEO) conseguiam ver `/financeiro` no client**, porque nenhum dos dois tem papel `dev`, só `equipe`. Migrar pro gate certo (`has_staff_role('financeiro')`, aplicado via `20261113020000_manager_tighten_finance_rpcs.sql`) corrige isso de verdade — os dois já têm o papel `financeiro` atribuído desde a decisão registrada na Fase 2a.

`list_open_chargebacks` segue só `is_staff()` — decisão já tomada na Fase 2b, chargebacks são relevantes pra mais de um papel (Dev e Financeiro usam o mesmo `ChargebacksCard`).

**O que moveu:** `AdminFinance.tsx` → `apps/manager/src/pages/Financeiro.tsx` (gate interno removido). Reaproveita o `ChargebacksCard` já migrado em `apps/manager/src/components/dev/` na Fase 2b (sem triplicar o arquivo). `downloadBlob` foi extraído de `apps/client/src/lib/contractDocs.ts` (arquivo de 688 linhas de geração de contrato) pra um `apps/manager/src/lib/downloadBlob.ts` próprio — só a função de 10 linhas que a tela realmente usa. `jspdf` virou dependência direta do `apps/manager/package.json` (não existia lá ainda).

**Limpeza final:** a cópia de `ChargebacksCard.tsx` que tinha sido restaurada em `apps/client/src/components/admin/` na Fase 2b (só pra não quebrar o `AdminFinance.tsx` enquanto ele ainda vivia lá) foi removida de vez — nada mais no client usa. A pasta `apps/client/src/components/admin/` deixou de existir (ficou vazia depois dos 3 passes da Fase 2).

**O que saiu do `apps/client`:** rota `/financeiro` + lazy import; o item "Financeiro" do `AppSidebar.tsx` — **último** bloco `canViewDev && (...)` que restava lá. `canViewDev` ficou sem nenhum uso de navegação no `AppSidebar.tsx` depois disso (removido da desestruturação; o campo continua existindo em `usePonderumPermissions.ts`, só não é mais lido — mesma decisão já tomada pra `canViewPonderumTeam` na Fase 2a). `/financeiro` agora dá 404.

**Fase 2 completa:** as 3 áreas internas (Equipe, Dev, Financeiro) saíram inteiramente do `apps/client` e vivem só no `apps/manager`, cada uma com seu próprio gate de papel (`equipe`/`dev`/`financeiro`) checado no banco, não só no front — conforme o princípio 2 da spec. Fase 3 (gestão do time `/time`, owner-only, e auditoria `/auditoria`) e as tabelas novas da spec (`leads`, `expenses`, `feature_flags`, `access_overrides`) ficam pra uma etapa futura, fora do escopo desta migração.

Testado localmente: `npm run typecheck`/`lint`/`build` limpos nos dois apps; bundle do `apps/client` sem nenhum resquício da página Financeiro.

## Auditoria de segurança pós-Fase 2 (2026-11-13)

Depois de fechar a Fase 2, o Vitor pediu uma conferência completa: garantir que `app.ponderum.com` não expõe nada das áreas Equipe/Dev/Financeiro nem pro front nem pro banco.

**Frontend/bundle:** confirmado limpo. Nenhuma rota `/admin`/`/equipe-ponderum`/`/financeiro`, nenhum link de menu, e o bundle de produção compilado (`apps/client/dist/assets/*.js`) não contém nenhum nome de RPC, Edge Function ou texto dessas 3 áreas — testado via grep direto no JS gerado, não só no código-fonte.

**Backend (defesa de verdade):** as 17 RPCs das 3 áreas (`get_admin_dashboard`, `get_admin_finance_summary`, `get_executive_dashboard`, `list_admin_payments`, `list_ponderum_staff`, `list_staff_organizations`, `list_staff_contracts`, `staff_create_invoice`, `staff_renew_org_subscription`, `staff_set_courtesy_unlock`, `staff_set_org_blocked`, `staff_set_org_plan_status`, `staff_set_org_risk_flag`, `staff_set_support_whatsapp`, `staff_update_member_permissions` com os 3 overloads, `get_support_stats`, `list_open_chargebacks`) foram conferidas uma a uma — todas checam `has_staff_role()`/`is_staff()` de verdade no corpo e levantam exceção, não é só a tela que esconde o botão. O linter de segurança do Supabase (`get_advisors`) acusa essas funções como "executáveis por anon/authenticated", mas isso é esperado pra qualquer RPC do PostgREST — o que importa é o check interno, que está presente em todas.

**3 bugs reais encontrados e corrigidos:** `admin-create-user`, `admin-send-invoice-email` e `billing-dev-simulator` sobreviveram à migração da Etapa A ainda lendo as colunas antigas `users.can_view_dev`/`can_view_ponderum_team`/`is_ponderum_staff` em vez de `staff_members.roles` (via `has_staff_role()`). Essas colunas pararam de ser a fonte de verdade desde a Etapa A (2026-11-11), mas continuam existindo na tabela (remoção adiada pra uma Fase 5 de limpeza) — e hoje coincidem com os papéis reais só porque nenhum dos 3 staff teve a permissão editada pela tela desde então. Na próxima edição de permissão via `PonderumStaffManagement`, essas 3 funções dessincronizariam (podendo negar acesso indevido a quem ganhou o papel, ou manter acesso de quem teve o papel revogado). Corrigido trocando as 3 pra `has_staff_role()` via RPC, com deploy já feito.

**RLS:** nenhuma policy referencia as colunas antigas — só as 2 funções que usam esses nomes como alias de parâmetro/coluna de saída (`list_ponderum_staff`, `staff_update_member_permissions`), não leitura real da tabela — confirmado seguro.

Conclusão: nenhum risco de exposição das 3 áreas pro `app.ponderum.com`, e a defesa em profundidade (banco, não só front) está intacta e agora mais robusta que antes da auditoria.
