# Manager — Relatório de Diagnóstico (Fase 0)

> Gerado conforme `docs/MANAGER_SPEC.md`, seção 11, Fase 0. Nenhum código foi alterado nesta fase, só leitura do repositório e do banco de produção (`igolxkyahbavripvfeak`). Aguardando aprovação antes de iniciar a Fase 1.

---

## 0. Risco crítico, achado nesta fase

Antes do resto do diagnóstico, um achado que não pode esperar a Fase 1:

**A função `get_admin_dashboard()` (usada pela tela `/admin`) verifica `users.role = 'admin'`, não `is_ponderum_staff`.** `role = 'admin'` é o papel que **qualquer cliente comum** recebe automaticamente ao criar sua própria organização (`handle_new_user()`, todo cadastro novo vira `role='admin'` da própria organização). Isso significa que, hoje, **qualquer cliente pagante que seja admin da própria organização pode chamar essa função diretamente** (via `supabase.rpc('get_admin_dashboard')`, sem precisar abrir a tela `/admin`) e receber: nome e plano de **todas** as organizações da plataforma, contagem de contratos/análises por organização, a lista completa de **leads da waitlist** (nome, e-mail, telefone, empresa) e todo o **feedback de usuários**.

Todas as outras 11 funções administrativas verificadas (`staff_*`, `get_admin_finance_summary`, `list_admin_payments`, `list_open_chargebacks`, `list_ponderum_staff`) checam corretamente `is_ponderum_staff`/`can_view_dev`/`can_view_ponderum_team`. Só esta função usa o critério errado — parece ser a mais antiga do grupo, de antes de essas colunas existirem, nunca atualizada.

**Recomendação:** corrigir isso **antes ou junto da Fase 1**, independente do cronograma do manager, trocando a checagem para `is_ponderum_staff = true`. É uma correção pequena e isolada (não depende de nenhuma peça do manager estar pronta), mas o risco é real e está em produção agora.

---

## 1. Mapeamento das três áreas, como existem hoje

Todas as três vivem dentro do mesmo app React do cliente (`src/app/App.tsx`), no mesmo projeto Vercel, protegidas só por checagem de perfil dentro do componente — nenhuma separação de bundle.

| Área da spec | Rota hoje | Componente de página | Gate de front |
|---|---|---|---|
| Dev | `/admin` | `src/pages/Admin.tsx` | `usePonderumPermissions().canViewDev` |
| Equipe Ponderum | `/equipe-ponderum` | `src/pages/PonderumTeam.tsx` | `usePonderumPermissions().canViewPonderumTeam` |
| Financeiro | `/financeiro` | `src/pages/AdminFinance.tsx` | `usePonderumPermissions().canViewDev` (⚠️ usa o mesmo perfil do Dev, não existe perfil "financeiro" separado hoje) |

As três rotas estão registradas em `src/app/App.tsx` ao lado de `/`, `/contracts`, `/settings` etc., dentro do mesmo `<ProtectedRoute><AppLayout /></ProtectedRoute>`. O código das três áreas vai para o bundle de produção do app do cliente (`dist/`), mesmo para quem nunca vê essas telas — viola diretamente o Princípio 1 da spec ("nenhuma tela do manager pode estar no bundle do app do cliente").

### Conteúdo de cada área hoje

**`/admin` (mistura Dev + parte do que a spec chama de Equipe):**
`StatsGrid`, `AnalysesChart`, `CronHealthCard`, link externo pro Sentry, `WaitlistTable`, `RecentActivityFeed`, `SupportChannelCard`, `OrganizationsTable`, `PonderumStaffManagement`, `ChargebacksCard`, `BillingDevSimulator`, `FeedbacksList` — todos em `src/components/admin/`.

**`/equipe-ponderum`:**
`ExecutiveDashboard`, `CreateStarterUserForm`, `OrganizationsManagementList` (busca/filtro de organizações, PII em texto puro, ações de cortesia/bloqueio/trocar plano, botão de WhatsApp pro upgrade).

**`/financeiro`:**
Cards do mês (vendido, taxas, líquido, a liberar, liberado, MRR, assinantes, inadimplentes, churn), lista "cai em", `ChargebacksCard`, exportação CSV/Excel/PDF. Só a parte de entradas (peça 9 do `PAGAMENTOS_SPEC.md`) — não existe nada de saídas/despesas.

---

## 2. Mecanismo de autorização atual

Não existe `staff_members` nem enum de papéis. O que existe: 5 colunas booleanas (+ 1 texto) direto na tabela `users`, a mesma tabela de qualquer usuário cliente:

```
users.is_ponderum_staff        boolean
users.can_view_dev              boolean
users.can_view_ponderum_team   boolean
users.full_platform_access     boolean
users.staff_job_title           text
```

Não existe distinção `owner`/`dev`/`equipe`/`financeiro` da spec — `can_view_dev` cobre Dev **e** Financeiro ao mesmo tempo (ver tabela acima), e não há conceito de "dono" com poder exclusivo de gerenciar o time (hoje quem tem `can_view_dev=true` já pode alterar as permissões de qualquer outro membro via `staff_update_member_permissions`).

A checagem de verdade (a que importa de verdade, já que o front só esconde botão) está dentro de **12 funções SQL `security definer`** (`get_admin_dashboard`, `get_admin_finance_summary`, `list_admin_payments`, `list_open_chargebacks`, `list_ponderum_staff`, `staff_create_invoice`, `staff_renew_org_subscription`, `staff_set_courtesy_unlock`, `staff_set_org_blocked`, `staff_set_org_plan_status`, `staff_set_org_risk_flag`, `staff_set_support_whatsapp`, `staff_update_member_permissions`), cada uma com a mesma checagem repetida manualmente (`select 1 from users where id = auth.uid() and <coluna> = true`), sem uma função central equivalente a `is_staff()`/`has_staff_role()` da spec. Isso é o que causou o achado da seção 0: uma das doze ficou desatualizada e ninguém notou.

RLS direto (policy na tabela, não dentro de função) usando `is_ponderum_staff` só existe em **3 lugares**: `analysis_shadow_context`, `clause_gating_shadow` (ver risco abaixo) e o bucket de Storage de notas fiscais. As tabelas de cobrança (`payments`, `subscriptions`, `fiscal_invoices`, `chargebacks`) **não têm policy de leitura para staff** — o acesso de hoje é só via essas funções RPC, que já fazem a checagem e devolvem só o agregado/lista necessária. É uma diferença de arquitetura em relação à seção 4 da spec, que pede policies de staff direto nas tabelas de cobrança — funciona, mas por um caminho diferente (ver seção 6, decisão a tomar).

### Risco adicional: possível vazamento de conteúdo de contrato pro staff

As tabelas `analysis_shadow_context` e `clause_gating_shadow` (usadas para auditoria/calibração do pipeline de IA) têm colunas `evidence` e `qualitative_alert` (texto livre) que provavelmente contêm trecho do contrato analisado, citado pela IA como evidência. Essas duas tabelas liberam leitura pra **qualquer** `is_ponderum_staff = true`, sem exigir `can_view_dev`, sem consentimento do cliente, sem registro de quem acessou. Precisa confirmar o conteúdo real dessas colunas antes da Fase 1 — se confirmado que contém excerto do contrato, viola diretamente o Princípio 6 ("nenhuma área do manager mostra o conteúdo dos contratos") e precisa ser resolvido (mover pra trás de `support_access_grants`, ou remover o acesso de staff e manter só uso interno do pipeline).

---

## 3. O que existe × o que a spec pede (modelo de dados novo)

| Tabela da spec | Existe algo equivalente? | Lacuna |
|---|---|---|
| `staff_members` + `staff_role` | Não. 5 colunas booleanas em `users` (ver seção 2) | Sem distinção `owner`, sem MFA embutido no modelo, sem `invited_by`/`last_login_at` |
| `is_staff()` / `has_staff_role()` | Não, como função central. 12 checagens duplicadas manualmente | A duplicação já causou 1 bug real (seção 0) |
| `staff_audit_log` | **Não existe.** `billing_audit_log` existe mas só registra transição de estado de assinatura/pagamento, nunca ação de staff | **Nenhuma ação de staff é auditada hoje** — conceder cortesia, bloquear organização, revelar PII, trocar plano manual, tudo isso acontece sem nenhum rastro de quem fez, quando, por quê |
| `access_overrides` | Não como tabela unificada. Hoje é um campo por propósito: `organizations.plan_status`/`plan_id` (escrito direto por `staff_set_org_plan_status`), `organizations.blocked` (boolean), `organizations.risk_flagged` (boolean), `contract_analyses.courtesy_unlock` (boolean por análise) | Sem prazo de validade, sem motivo obrigatório, sem histórico (sobrescreve o valor anterior), sem conceito de "estender trial" |
| `leads` + `lead_notes` | Tabela `waitlist` existe, schema parecido mas mais simples | Sem `status` de funil, sem `owner_id` (responsável), sem `consent_text_version`, sem `lead_notes`, sem `converted_organization_id`. Inserção é **direta da LP com `anon` key**, policy `waitlist_public_insert` sem captcha nem rate limit (a spec pede Edge Function `lp-lead` com os dois) |
| `expenses` | **Não existe.** A área Financeiro de hoje só mostra entradas (peça 9 do módulo de pagamentos); não há lançamento de saída nenhum | "Resultado" (líquido − saídas), DRE simplificada e fluxo de caixa projetado da spec não têm como existir sem isso |
| `app_errors` | **Não existe como tabela.** Erros vão só pro Sentry (serviço externo, link em `/admin`) | Sem agrupamento por `fingerprint` consultável no manager, sem marcar como resolvido, sem ligação direta com organização afetada dentro do próprio app |
| `feature_flags` | **Não existe** | Nenhuma flag hoje é configurável por plano/organização via UI |
| `support_access_grants` | **Não existe.** Não existe conceito de "acesso assistido com consentimento" | Combinado com o risco da seção 2 (shadow tables), staff já pode ver dado sensível sem esse mecanismo de consentimento existir ainda |
| `invoices` (manual, upload humano) | **Já existe**, inclusive com RPC própria (`staff_create_invoice`) e aba "Notas fiscais" no app do cliente | Coexiste com `fiscal_invoices` (fila automática da Fase 5c do módulo de pagamentos) — a tela "Notas fiscais" do cliente já mistura as duas origens; a tela do manager precisa fazer o mesmo |
| MFA (`aal2`) | **Não existe em lugar nenhum do projeto.** Única coisa parecida é o código OTP do fluxo de "esqueci a senha" (`RecoveryCodeForm`), que não é MFA de conta | Nenhuma conta de staff tem segundo fator hoje |
| PII mascarada por padrão | **Não existe.** CPF/CNPJ, telefone e e-mail aparecem em texto puro em `OrganizationsManagementList`, `CreateStarterUserForm`, `PonderumStaffManagement` | "Revelar = ação auditada" não existe porque nem auditoria existe ainda |

---

## 4. Separação de bundle e domínio

- Hoje: **um projeto Vercel só**, um `vercel.json`, um `dist/`. As três áreas administrativas compilam junto com o app do cliente.
- Precedente bom a reaproveitar: a landing page (`landing/`) **já é um projeto separado**, com seu próprio `vercel.json` — prova que o time já sabe operar múltiplos projetos Vercel apontando pro mesmo domínio raiz. O manager pode seguir o mesmo padrão de separação.
- Nenhum header de segurança tipo `noindex`/`X-Frame-Options: DENY` específico pra área admin hoje — o `vercel.json` do app do cliente já tem `X-Frame-Options: DENY` e CSP, mas são regras pensadas pro app do cliente, não pro manager.

---

## 5. Edge Functions administrativas existentes (mapeiam pras 7 da spec)

| Função hoje | Mais perto de qual `manager-*` da spec | Checagem de perfil atual |
|---|---|---|
| `admin-create-user` | `manager-team` (parcial) | `can_view_ponderum_team` |
| `admin-create-staff-member` | `manager-team` (parcial) | `can_view_dev` |
| `admin-send-invoice-email` | `manager-billing` (parcial) | `can_view_ponderum_team` |
| `admin-resend-onboarding-email` | `manager-team` (parcial) | `can_view_ponderum_team` ou `can_view_dev` |
| `billing-dev-simulator` | `manager-ops` (só em modo mock) | `is_ponderum_staff` e `can_view_dev` |

Nenhuma delas grava em auditoria. Nenhuma exige `aal2`. Todas já foram corrigidas nesta sessão quanto ao bug de `.maybeSingle()` sem filtro por `id` (não é um risco de autorização, era um bug de disponibilidade que derrubava a própria função quando a organização do chamador tinha mais de 1 usuário).

---

## 6. Decisões que o diagnóstico não pode tomar sozinho

1. **Manter o padrão de RPC `security definer` pras tabelas de cobrança, ou migrar pra RLS direta nas tabelas conforme a letra da spec?** O padrão de hoje (funções que já fazem a checagem e devolvem só o agregado) funciona e já está testado; migrar pra RLS direta é mais fiel à spec mas é retrabalho de algo que não está quebrado. Recomendo manter o padrão de função, só generalizando a checagem pra `has_staff_role()`.
2. **O que fazer com `analysis_shadow_context`/`clause_gating_shadow`** (seção 2) antes da Fase 1 — confirmar se `evidence`/`qualitative_alert` contêm texto do contrato.
3. **Unificar `is_ponderum_staff`+4 colunas em `staff_members`+`staff_role[]` real, ou manter as colunas em `users` e só adicionar as faltantes (MFA, auditoria)?** A spec pede tabela separada; o projeto hoje já tem tudo embutido em `users`. Migrar é mais trabalho, mas resolve a causa raiz do bug da seção 0 (duplicação de checagem) de uma vez.
4. Todas as 7 decisões já listadas na seção 10 do `MANAGER_SPEC.md` (domínio do app do cliente, quem recebe cada perfil, Cloudflare Access, prazo de acesso assistido, categorias de despesa, premissas de churn, provedor de captcha).

---

## 7. Ordem de fases proposta

A ordem da spec (seção 11) já é a certa; a única mudança é **inserir a correção do risco crítico antes da Fase 1**, e ajustar o que a Fase 1 engloba porque mais coisa do que o esperado já existe:

**Fase 0.5 — Corrigir `get_admin_dashboard()` (pode ser feita isolada, antes de qualquer coisa do manager)**
- Trocar a checagem de `role = 'admin'` para `is_ponderum_staff = true`. Correção de 1 linha, risco real em produção, não depende de nenhuma peça do manager.

**Fase 1 — Fundação de acesso** (como a spec já descreve, mais:)
- Decidir e implementar o item 3 da seção 6 acima (`staff_members` real vs. colunas em `users` + o que falta).
- Criar `has_staff_role()`/`is_staff()` central, migrar as 12 funções hoje duplicadas pra usá-la.
- `staff_audit_log` (não existe nada equivalente — prioridade alta, hoje zero ação de staff é rastreada).
- MFA (não existe nenhuma base pra reaproveitar — construir do zero conforme a spec).

**Fase 2 — Migrar a Área Equipe**
- `OrganizationsManagementList`/`ExecutiveDashboard`/`CreateStarterUserForm` já existem e são o ponto de partida real — é adaptação, não reescrita.
- `access_overrides` é a maior lacuna de dado aqui: hoje são 3 campos soltos (`plan_status`/`blocked`/`risk_flagged`) sem prazo nem motivo. Decidir se vira a tabela unificada da spec ou se os campos atuais ganham só o que falta (motivo, auditoria).
- Leads: `waitlist` já existe, precisa virar o funil completo (`status`, `owner_id`, `lead_notes`) e sair do insert direto por `anon` pra uma Edge Function com captcha/rate limit.

**Fase 3 — Migrar a Área Financeiro**
- Entradas: `get_admin_finance_summary`/`list_admin_payments` já existem e funcionam, é só mover de lugar.
- Saídas (`expenses`), previsão de recebimento e indicadores: tudo a construir do zero, nada disso existe hoje.

**Fase 4 — Migrar a Área Dev**
- `StatsGrid`/`CronHealthCard`/`BillingDevSimulator`/`ChargebacksCard` já existem.
- `app_errors`, `feature_flags`, custo de IA por organização, acesso assistido: tudo a construir do zero.
- Resolver antes desta fase o risco da seção 2 (shadow tables), já que "Clientes (visão técnica)" e "Acesso assistido" são desta área.

**Fase 5 — Limpeza e endurecimento** (como a spec já descreve).

---

*Nenhum dado existente foi apagado ou migrado nesta fase. Aguardando aprovação do Vitor antes de iniciar a Fase 0.5 ou a Fase 1.*
