# Ponderum Manager — Especificação do Portal Interno (manager.ponderum.com)

> **Para os agentes:** este documento é a fonte da verdade do portal interno da Ponderum. Leia-o inteiro antes de escrever código. Ele complementa o `docs/PAGAMENTOS_SPEC.md` e usa as mesmas tabelas de cobrança (planos, assinaturas, pagamentos, notas).
>
> ⚠️ **As três áreas já existem em alguma forma** (Área Dev, Área Equipe Ponderum, Área Financeiro), provavelmente dentro do app do cliente. Este trabalho **move e protege** essas áreas: tira tudo de dentro de `app.ponderum.com` / `ponderum.com` e leva para um app separado em `manager.ponderum.com`, com controle de acesso por perfil. **Adaptar e reaproveitar o que existe, não reescrever.** Comece pela **Fase 0 (Diagnóstico)** na seção 11.

**Stack:** React + TypeScript (Vercel) · Supabase (mesmo projeto do app do cliente: Postgres, Auth, Edge Functions) · mesmas convenções do módulo de pagamentos.

---

## 1. Objetivo e princípios

**Objetivo:** um portal só para o time da Ponderum, em domínio próprio, onde cada pessoa vê apenas o que a sua função exige.

**Princípios inegociáveis**
1. **Separação física do código.** Nenhuma tela, rota, componente ou chamada de API do manager pode estar no bundle do app do cliente. O manager é **outro projeto na Vercel**, com outro build. Esconder um menu não é proteção: o código continua indo para o navegador do cliente.
2. **A segurança está no banco e no backend, nunca no front.** O front do manager só esconde botões. Quem bloqueia de verdade são as políticas de RLS do Supabase e as checagens de perfil nas Edge Functions. Mesmo que alguém abra o manager com uma conta de cliente, o banco não devolve nada.
3. **Menor privilégio.** Cada perfil acessa só o necessário (matriz na seção 3).
4. **MFA obrigatório** para qualquer conta do time (autenticador TOTP via Supabase Auth). Sem segundo fator, sem acesso.
5. **Tudo é auditado.** Toda ação que altera dados ou revela dado sensível grava em `staff_audit_log` (append-only): quem, o quê, em quem, quando, de onde e por quê.
6. **Sigilo do conteúdo dos clientes.** Os clientes são advogados e escritórios, e os contratos que eles enviam são confidenciais (sigilo profissional). **Nenhuma área do manager mostra o conteúdo dos contratos nem os resultados das análises.** O manager vê metadados: quantidade, datas, status, tempo de processamento, erros técnicos, custo. A exceção é suporte técnico com consentimento do cliente, registrado (seção 6.1, "acesso assistido").
7. **Dados pessoais mascarados por padrão** (CPF/CNPJ, telefone, e-mail completo em listas). Revelar o dado completo é uma ação registrada.
8. **Service role nunca no front.** Operações privilegiadas passam por Edge Functions que validam perfil e MFA.

---

## 2. Arquitetura e domínio

```
ponderum.com            → landing page (LP) — gera leads
app.ponderum.com*       → app do cliente (Vercel projeto A)
manager.ponderum.com    → portal interno (Vercel projeto B)   ← novo
                               │
                               ▼
                    Supabase (mesmo projeto)
                    ├─ RLS por perfil de staff (is_staff / has_staff_role)
                    ├─ Edge Functions manager-* (ações privilegiadas + auditoria)
                    └─ staff_members, staff_audit_log, leads, expenses, app_errors…
```
\* usar o domínio real do app do cliente.

### Organização do código
- **Preferido:** monorepo com dois apps e código compartilhado.
  ```
  apps/web/        # app do cliente (já existe)
  apps/manager/    # portal interno (novo)
  packages/ui/     # componentes, tokens da marca (navy/emerald/teal, Inter, JetBrains Mono)
  packages/types/  # tipos gerados do Supabase (supabase gen types)
  packages/supabase/ # client factory, helpers de auth
  supabase/        # migrations e Edge Functions (compartilhado)
  ```
- **Se migrar para monorepo for caro agora:** criar `manager/` como segundo app Vite na raiz e copiar os componentes necessários. O que importa é **build e projeto Vercel separados**.

### Vercel
- Novo projeto Vercel apontando para o mesmo repositório com **Root Directory = `apps/manager`**.
- Adicionar o domínio `manager.ponderum.com` no projeto e criar o registro **CNAME** `manager` → valor indicado pela Vercel, no provedor de DNS do domínio.
- Variáveis de ambiente próprias: URL e anon key do Supabase. **Nenhuma service role.**
- Deploys de *Preview* do manager com **Vercel Deployment Protection** ligado (preview acessível só para membros do time Vercel).
- `vercel.json` do manager:
  - rewrite de todas as rotas para `index.html`
  - headers: `X-Robots-Tag: noindex, nofollow`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Strict-Transport-Security`, CSP restrita (só o próprio domínio + Supabase)
- `robots.txt` com `Disallow: /`.
- **Camada extra opcional (recomendada):** colocar o manager atrás de um controle de acesso na borda (ex.: Cloudflare Access/Zero Trust com login Google do domínio da empresa, ou o firewall da Vercel com allowlist de IP). Assim a página de login nem fica exposta para a internet.

### Supabase Auth
- Adicionar `https://manager.ponderum.com/**` às Redirect URLs.
- A sessão do manager é separada da sessão do app do cliente (origens diferentes = storage diferente).
- **Contas do time não se cadastram sozinhas.** O manager não tem tela de "criar conta"; só login. Convites são feitos por um `owner` (seção 6.4).
- MFA: o manager exige `aal2` (verificado no front **e** nas policies/Edge Functions via claim `aal` do JWT).
- Sessão do manager mais curta: logout automático após 30 min sem atividade; renovação de MFA a cada 12 h.

---

## 3. Perfis e matriz de permissões

| Perfil | Quem | Resumo |
|---|---|---|
| `owner` | sócios fundadores | Tudo, incluindo gerenciar o time e ver a auditoria |
| `dev` | desenvolvimento | Área Dev completa; leitura limitada de clientes; sem valores financeiros detalhados |
| `equipe` | comercial, sucesso do cliente, suporte | Área Equipe completa; sem área Dev nem Financeiro |
| `financeiro` | financeiro, contador interno | Área Financeiro completa; leitura de cadastro para faturamento |

Uma pessoa pode ter mais de um perfil (ex.: `dev` + `financeiro`).

| Recurso / ação | owner | dev | equipe | financeiro |
|---|:-:|:-:|:-:|:-:|
| **Área Dev**: erros, logs, jobs, webhooks, saúde do sistema | ✅ | ✅ | — | — |
| Dev: reprocessar webhook / job / nota | ✅ | ✅ | — | ✅ (só nota) |
| Dev: feature flags (ver e alterar) | ✅ | ✅ | ver | — |
| Dev: acesso assistido à conta do cliente (com consentimento) | ✅ | ✅ | — | — |
| **Área Equipe**: lista e detalhe de usuários/organizações | ✅ | ver | ✅ | ver |
| Equipe: ajustar acesso (cortesia, estender trial, suspender, reativar) | ✅ | ✅ | ✅ | — |
| Equipe: trocar plano manualmente | ✅ | — | ✅ | ✅ |
| Equipe: leads da LP (ver, mudar status, anotar, exportar) | ✅ | — | ✅ | — |
| Revelar CPF/CNPJ/telefone completo | ✅ | — | ✅ (motivo obrigatório) | ✅ (motivo obrigatório) |
| **Área Financeiro**: entradas, saídas, previsão, indicadores | ✅ | — | — | ✅ |
| Financeiro: lançar/editar saídas | ✅ | — | — | ✅ |
| Financeiro: estorno | ✅ | — | — | ✅ (dupla confirmação) |
| Financeiro: exportar CSV | ✅ | — | — | ✅ |
| Conteúdo de contratos/análises dos clientes | ❌ | ❌* | ❌ | ❌ |
| Gerenciar time (convidar, perfis, desativar) | ✅ | — | — | — |
| Ver auditoria completa | ✅ | só as próprias ações | só as próprias | só as próprias |

\* só via acesso assistido com consentimento registrado.

---

## 4. Modelo de dados (novas tabelas)

Manter os nomes que já existirem no projeto e registrar o mapeamento em `docs/manager-decisions.md`.

```sql
create type staff_role as enum ('owner','dev','equipe','financeiro');

create table staff_members (
  user_id uuid primary key references auth.users(id),
  full_name text not null,
  email text not null unique,
  roles staff_role[] not null check (array_length(roles,1) >= 1),
  is_active boolean not null default true,
  invited_by uuid references auth.users(id),
  last_login_at timestamptz,
  created_at timestamptz not null default now()
);

-- Funções usadas pelas policies (security definer, search_path fixo)
create or replace function public.has_staff_role(r staff_role) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from staff_members
    where user_id = auth.uid() and is_active
      and (r = any(roles) or 'owner' = any(roles))
  ) and coalesce(auth.jwt()->>'aal','aal1') = 'aal2';
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from staff_members where user_id = auth.uid() and is_active)
     and coalesce(auth.jwt()->>'aal','aal1') = 'aal2';
$$;

-- Auditoria append-only (sem UPDATE/DELETE para ninguém, nem owner)
create table staff_audit_log (
  id bigserial primary key,
  actor_id uuid not null references auth.users(id),
  actor_roles staff_role[] not null,
  action text not null,               -- ex.: 'access.grant_courtesy', 'pii.reveal', 'refund.create'
  target_type text,                   -- 'organization' | 'user' | 'lead' | 'payment' | ...
  target_id text,
  reason text,                        -- obrigatório para ações sensíveis
  before jsonb, after jsonb,
  ip inet, user_agent text,
  created_at timestamptz not null default now()
);
revoke update, delete on staff_audit_log from authenticated, anon;

-- Ajustes manuais de acesso (cortesia, extensão de trial, bloqueio)
create table access_overrides (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  kind text not null check (kind in ('courtesy','trial_extension','feature_grant','suspension')),
  plan_id uuid references billing_plans(id),        -- para cortesia de plano
  features jsonb,                                   -- para feature_grant
  starts_at timestamptz not null default now(),
  ends_at timestamptz,                              -- obrigatório exceto suspensão
  reason text not null,
  created_by uuid not null references auth.users(id),
  revoked_at timestamptz, revoked_by uuid references auth.users(id)
);

-- Leads da landing page
create table leads (
  id uuid primary key default gen_random_uuid(),
  name text, email text not null, phone text, company text, role text,
  firm_size text, message text,
  source text, utm_source text, utm_medium text, utm_campaign text, utm_content text,
  consent_marketing boolean not null default false,   -- LGPD
  consent_text_version text,
  status text not null default 'novo'
    check (status in ('novo','contatado','demo_agendada','proposta','convertido','perdido')),
  owner_id uuid references auth.users(id),            -- responsável no time
  converted_organization_id uuid references organizations(id),
  lost_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table lead_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  body text not null,
  created_at timestamptz not null default now()
);

-- Saídas (despesas)
create table expenses (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in
    ('ia_api','infraestrutura','gateway_taxas','impostos','marketing','ferramentas','pessoal','juridico_contabil','outros')),
  vendor text not null,                 -- ex.: 'Anthropic', 'Vercel', 'Supabase', 'Meta Ads'
  description text,
  amount_cents integer not null check (amount_cents > 0),
  competence_month date not null,       -- mês de competência (1º dia do mês)
  due_date date, paid_at date,
  status text not null default 'previsto' check (status in ('previsto','pago','cancelado')),
  recurrence text not null default 'none' check (recurrence in ('none','monthly','yearly')),
  attachment_path text,                 -- comprovante no Storage (bucket privado)
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

-- Erros da aplicação (front e Edge Functions)
create table app_errors (
  id bigserial primary key,
  source text not null check (source in ('web','manager','edge_function','job','webhook','ai_pipeline')),
  severity text not null default 'error' check (severity in ('warning','error','critical')),
  code text, message text not null,
  fingerprint text,                     -- agrupa erros iguais
  organization_id uuid, user_id uuid,
  context jsonb,                        -- SEM conteúdo de contrato, SEM PII completa
  resolved_at timestamptz, resolved_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index on app_errors (fingerprint, created_at desc);

-- Feature flags
create table feature_flags (
  key text primary key,                 -- ex.: 'nova_analise_v2'
  description text,
  enabled_globally boolean not null default false,
  enabled_plans text[] not null default '{}',     -- códigos de plano
  enabled_organizations uuid[] not null default '{}',
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

-- Acesso assistido (suporte com consentimento)
create table support_access_grants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  granted_by_user_id uuid not null references auth.users(id),  -- o CLIENTE que autorizou
  staff_user_id uuid not null references auth.users(id),
  scope text not null check (scope in ('metadata','read_contracts')),
  ticket_reference text,
  expires_at timestamptz not null,       -- máx. 24 h
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
```

**Entitlements:** a view `organization_entitlements` (do PAGAMENTOS_SPEC) passa a considerar `access_overrides` ativos: suspensão sobrepõe tudo; cortesia/extensão de trial concede acesso mesmo sem assinatura paga; `feature_grant` soma recursos ao plano.

**Métricas de uso sem conteúdo:** se ainda não existir, criar uma tabela/view `usage_events` (organização, tipo de evento, data, tokens/custo de IA, duração, status), alimentada pelo pipeline de análise. Ela abastece a Área Dev (erros, custo) e a Área Equipe (engajamento) **sem tocar no texto dos contratos**.

### RLS (regras gerais)
- Todas as tabelas acima: RLS ligado; `anon` sem acesso.
- `staff_members`: leitura para `is_staff()`; escrita só via Edge Function `manager-team` (owner).
- `staff_audit_log`: INSERT só via Edge Functions (service role); SELECT para `has_staff_role('owner')` ou `actor_id = auth.uid()`.
- `leads`, `lead_notes`: `has_staff_role('equipe')`. A LP grava leads só via Edge Function pública `lp-lead` (com captcha e rate limit), nunca com insert direto pela anon key.
- `expenses`: `has_staff_role('financeiro')`.
- `app_errors`, `feature_flags` (escrita): `has_staff_role('dev')`; leitura de flags também para `equipe`.
- `access_overrides`: leitura para `is_staff()`; escrita só via Edge Function `manager-access`.
- Tabelas de cobrança existentes (`payments`, `subscriptions`, `fiscal_invoices`…): **adicionar** policies de leitura para staff conforme a matriz, sem afrouxar as policies do cliente.
- **Tabelas com conteúdo de contrato/análise:** nenhuma policy de staff. Acesso só pela função de acesso assistido, que checa `support_access_grants` válido.
- Views para o manager com `security_invoker = true` (respeitam a RLS de quem consulta).

### Edge Functions do manager
Todas validam: JWT válido → `aal2` → `staff_members.is_active` → perfil exigido → grava `staff_audit_log` → executa.

| Função | Ações |
|---|---|
| `manager-access` | conceder cortesia, estender trial, conceder recurso, suspender, reativar, revogar override |
| `manager-pii` | revelar CPF/CNPJ/telefone/e-mail completo (exige `reason`) |
| `manager-billing` | trocar plano manualmente, estornar (dupla confirmação), reemitir nota |
| `manager-ops` | reprocessar webhook/job, resolver erro, alterar feature flag |
| `manager-support` | iniciar/encerrar acesso assistido (exige grant válido do cliente) |
| `manager-team` | convidar, alterar perfis, desativar membro (só owner) |
| `manager-export` | exportações CSV (leads, financeiro), registradas na auditoria |

---

## 5. Estrutura do app manager

```
apps/manager/src/
  app/
    routes.tsx               # rotas protegidas por perfil
    guards/RequireStaff.tsx  # exige sessão + aal2 + staff ativo
    guards/RequireRole.tsx
  layout/ Sidebar (itens por perfil), Topbar (usuário, perfis, sair), EnvBadge (PROD/STAGING)
  features/
    auth/      LoginPage, MfaEnrollPage, MfaChallengePage
    home/      Painel inicial por perfil
    dev/       ...
    equipe/    ...
    financeiro/...
    team/      gestão do time (owner)
    audit/     log de auditoria
  lib/ supabase.ts, useStaff.ts (perfis do usuário logado), maskPII.ts, money.ts
```

- **Selo de ambiente** fixo no topo: `PRODUÇÃO` (vermelho) ou `STAGING` (amarelo).
- Toda ação sensível abre um modal de confirmação com campo **Motivo** obrigatório.
- Tabelas com busca, filtros, paginação no servidor e exportação (quando permitido).

---

## 6. As três áreas

### 6.1 Área Dev (`/dev`) — perfis `dev`, `owner`

| Tela | Conteúdo |
|---|---|
| **Saúde do sistema** | Status das Edge Functions, fila de webhooks (`received`/`failed`), jobs do pg_cron (última execução, duração, erro), notas fiscais com erro, latência e taxa de erro do pipeline de IA nas últimas 24 h |
| **Erros** | `app_errors` agrupados por `fingerprint`: contagem, primeira/última ocorrência, organizações afetadas, contexto técnico; marcar como resolvido. Filtros por origem e severidade |
| **Webhooks** | Lista de `webhook_events` com payload (sem dados de cartão, que nem existem), status e erro; botão **Reprocessar** |
| **Jobs** | Histórico de execução; botão **Rodar agora** (com auditoria) |
| **Clientes (visão técnica)** | Busca por organização: plano, status da assinatura, overrides ativos, flags habilitadas, uso (quantidade de análises, tokens, custo de IA, erros), últimos eventos técnicos. **Sem conteúdo de contrato** |
| **Liberação de acesso** | Atalho para as mesmas ações de `manager-access` (cortesia, extensão, suspensão), com motivo |
| **Funcionalidades (feature flags)** | Lista de flags; ligar por global/plano/organização; visualizar quais organizações têm cada recurso; histórico de alterações |
| **Matriz plano × recursos** | Leitura de `billing_plans.features` lado a lado, para conferir o que cada plano libera |
| **Acesso assistido** | Só com `support_access_grants` válido (o cliente autoriza dentro do app dele, com prazo máximo de 24 h e escopo). Sessão com banner "Acesso assistido: tudo é registrado"; encerra sozinho no prazo |
| **Custo de IA** | Custo por dia/organização/modelo (Haiku × Sonnet), custo médio por contrato, organizações que mais consomem |

No app do cliente: criar em Configurações → Suporte o botão **"Autorizar acesso do suporte"** (escolher prazo e escopo; revogar a qualquer momento). Isso gera o `support_access_grants`.

### 6.2 Área Equipe Ponderum (`/equipe`) — perfis `equipe`, `owner` (leitura para `dev`/`financeiro`)

| Tela | Conteúdo |
|---|---|
| **Usuários e organizações** | Lista com busca (nome, e-mail, escritório, CNPJ mascarado), filtros (plano, status da assinatura, data de cadastro, último acesso, em trial, inadimplente). Colunas: organização, responsável, plano, status, membros, último acesso, análises no mês |
| **Detalhe da organização** | Dados cadastrais (PII mascarada + botão **Revelar** com motivo), membros e papéis, plano e assinatura, histórico de pagamentos (status e valores, sem detalhe de taxas), overrides de acesso, engajamento (gráfico de uso), linha do tempo (cadastro, trial, pagamento, cancelamento, tickets) |
| **Ajustar acesso** | Conceder cortesia (plano + prazo), estender trial (+N dias), conceder recurso específico, suspender/reativar, trocar plano manualmente (com ou sem cobrança). Motivo obrigatório; tudo em `access_overrides` + auditoria |
| **Leads da LP** | Funil em lista e em kanban (`novo → contatado → demo_agendada → proposta → convertido/perdido`); filtros por origem/UTM/período/responsável; atribuir responsável; notas; marcar como convertido vinculando à organização criada; motivo de perda; exportar CSV (auditado). Indicadores: leads por semana, taxa de conversão por origem/campanha |
| **Integração LP → leads** | O formulário da LP envia para a Edge Function `lp-lead`: validação, captcha (ex.: Cloudflare Turnstile), rate limit por IP, gravação de UTM e do texto de consentimento. Notificação para o time por e-mail quando entra um lead novo |

LGPD nos leads: só entra em campanha quem marcou consentimento; botão **Excluir lead** (direito de eliminação, auditado); leads `perdido` sem interação há 24 meses → anonimizar automaticamente.

### 6.3 Área Financeiro (`/financeiro`) — perfis `financeiro`, `owner`

| Tela | Conteúdo |
|---|---|
| **Visão geral** | Cards do mês: receita bruta, taxas do gateway, receita líquida, saídas, **resultado** (líquido − saídas), MRR, assinantes ativos, ticket médio, churn, inadimplência (`past_due`), chargebacks abertos. Comparação com o mês anterior |
| **Entradas** | Pagamentos (de `payments`): data, organização, plano, método (cartão/Pix), bruto, taxa, líquido, status, data de liberação, nota fiscal. Filtros e exportação CSV |
| **Saídas** | CRUD de `expenses`: categoria, fornecedor, valor, competência, vencimento, pago/previsto, recorrência, comprovante (upload em bucket privado). Despesas recorrentes geram o lançamento previsto do mês seguinte automaticamente. Lançamento automático das taxas do gateway como saída, a partir de `payments.fee_cents` |
| **Previsão de recebimento** | (a) **A liberar:** pagamentos aprovados com `money_release_date` futura, agrupados por data ("cai em"). (b) **Renovações previstas:** assinaturas ativas × valor do plano por data de vencimento nos próximos 30/60/90 dias, com cenário pessimista descontando a taxa histórica de recusa/churn. (c) **Fluxo de caixa projetado:** a liberar + renovações − saídas previstas, por semana |
| **Indicadores** | Gráficos: MRR (12 meses), novos × cancelados, receita por plano, custo de IA vs. receita (margem bruta por cliente), CAC simples (marketing ÷ novos clientes) |
| **Notas fiscais** | Lista de `fiscal_invoices` com status; reemitir com erro; baixar PDF/XML; exportar para o contador |
| **Estornos e chargebacks** | Lista, prazos de defesa, estornar (dupla confirmação + motivo) |
| **Exportações** | CSV mensal (entradas, saídas, notas) para a contabilidade; DRE simplificada do mês |

Valores sempre em centavos no banco, formatados em BRL no front (JetBrains Mono para números).

### 6.4 Gestão do time (`/time`) — só `owner`
- Convidar membro (e-mail + perfis): cria o usuário via Admin API na Edge Function `manager-team` e envia o convite. No primeiro login, o MFA é obrigatório.
- Alterar perfis, desativar (o acesso cai na hora: `is_active=false` + revogar as sessões).
- Ver último login e ações recentes de cada membro.
- Regra: sempre deve existir pelo menos 1 `owner` ativo.

### 6.5 Auditoria (`/auditoria`)
- `owner`: tudo, com filtros por pessoa, ação, alvo e período; exportável.
- Demais perfis: apenas as próprias ações.

---

## 7. Migração das áreas existentes
1. Mapear onde as 3 áreas estão hoje (rotas, componentes, queries, policies, checagens tipo `if (user.email === ...)` ou `is_admin`).
2. Copiar ou mover os componentes para `apps/manager`, trocando checagens de front por `RequireRole` + RLS.
3. Remover rotas, componentes, imports e chamadas administrativas do app do cliente. **Critério de aceite:** buscar no bundle de produção do app do cliente (`dist/`) por termos como `financeiro`, `staff`, `manager-`, `leads`, `expenses` e não encontrar nada.
4. Substituir qualquer flag antiga de admin (`is_admin`, lista de e-mails hardcoded etc.) por `staff_members`. Migrar quem já tem acesso hoje para `staff_members` com o perfil correto.
5. Revisar policies antigas que liberavam leitura ampla para "admin" e trocar por `has_staff_role(...)`.
6. Redirecionar a rota antiga (ex.: `/admin` no app do cliente) para 404, nunca para o manager (não divulgar o endereço).

---

## 8. Segurança: checklist
- [ ] Manager em projeto Vercel separado; nenhum código administrativo no bundle do cliente
- [ ] MFA (`aal2`) exigido no front, nas policies e nas Edge Functions
- [ ] Sem cadastro público no manager; convites só por owner
- [ ] RLS em todas as tabelas novas; testes de policy para cada perfil e para um usuário cliente comum
- [ ] Conteúdo de contratos inacessível para staff, salvo acesso assistido válido
- [ ] PII mascarada por padrão; revelar = auditado com motivo
- [ ] `staff_audit_log` sem UPDATE/DELETE
- [ ] Headers de segurança, `noindex`, CSP, `X-Frame-Options: DENY`
- [ ] Preview deployments protegidos
- [ ] Timeout de sessão de 30 min; desativação de membro revoga as sessões
- [ ] Rate limit e captcha no endpoint de leads da LP
- [ ] Bucket de comprovantes de despesas privado, com URLs assinadas de curta duração
- [ ] (Opcional) Cloudflare Access ou allowlist de IP na frente do manager

## 9. Testes
- **Policies (pgTAP ou scripts SQL):** para cada tabela, testar leitura e escrita com: usuário cliente, staff sem MFA, cada perfil com MFA, staff desativado.
- **Edge Functions:** cada ação rejeita perfil errado, sem `aal2`, sem motivo; grava auditoria.
- **E2E (Playwright):** login + MFA; cada perfil vê só o seu menu e recebe 403/vazio ao forçar URL de outra área; ajustar acesso reflete no app do cliente; lead da LP aparece na lista.
- **Bundle do cliente:** teste automatizado de busca dos termos administrativos no build.

## 10. Decisões em aberto (o Vitor define; os agentes usam valores configuráveis)
1. Domínio atual do app do cliente (para os redirects e a configuração de CORS).
2. Quem do time recebe cada perfil.
3. Usar Cloudflare Access / allowlist de IP na frente do manager? (recomendado)
4. Tempo máximo do acesso assistido (padrão 24 h) e se o escopo `read_contracts` vai existir.
5. Categorias de despesa definitivas (alinhar com o contador).
6. Premissas da previsão (taxa de churn/recusa para o cenário pessimista).
7. Provedor de captcha da LP.

---

## 11. Plano de execução (tarefas para os agentes)

**Fase 0 — Diagnóstico (obrigatória, sem alterar código)**
- Mapear as 3 áreas existentes: rotas, componentes, tabelas, policies, forma atual de checar "admin".
- Listar o que cada área já faz × o que esta spec pede.
- Apontar riscos atuais (ex.: telas admin no bundle do cliente, policies abertas, service role no front, e-mails hardcoded).
- Gerar `docs/manager-gap-report.md` e a ordem ajustada das fases. **Parar e aguardar aprovação.**

**Fase 1 — Fundação de acesso**
- Migrations: `staff_members`, funções `is_staff`/`has_staff_role`, `staff_audit_log`, `access_overrides`.
- Criar o app `apps/manager` (Vite + React + TS), login + MFA + guards + layout com menu por perfil.
- Projeto Vercel + domínio `manager.ponderum.com` + headers de segurança.
- Edge Function base com o middleware (JWT → aal2 → staff → perfil → auditoria).

**Fase 2 — Migrar a Área Equipe**
- Usuários/organizações, detalhe, PII mascarada + `manager-pii`, ajustar acesso via `manager-access` + entitlements com overrides.
- Leads: tabela (ou adaptação da existente), Edge Function `lp-lead`, lista/kanban/notas/exportação.

**Fase 3 — Migrar a Área Financeiro**
- Entradas (dos `payments`), `expenses` + CRUD + recorrência + comprovantes, previsão de recebimento, indicadores, notas, estornos, exportações.

**Fase 4 — Migrar a Área Dev**
- `app_errors` + captura de erros no web, manager e Edge Functions; saúde do sistema; webhooks/jobs com reprocessamento; feature flags; custo de IA; acesso assistido (lado manager + botão de autorização no app do cliente).

**Fase 5 — Limpeza e endurecimento**
- Remover as áreas do app do cliente, redirecionar rotas antigas para 404, teste de bundle, revisão de policies antigas, gestão do time, tela de auditoria, checklist da seção 8 completo.

---

### Prompt de início para o agente

> Você vai implementar o portal interno da Ponderum (manager.ponderum.com) seguindo `docs/MANAGER_SPEC.md`, que complementa `docs/PAGAMENTOS_SPEC.md`. Leia os dois. As áreas Dev, Equipe Ponderum e Financeiro **já existem** em alguma forma no app do cliente: o trabalho é movê-las para um app separado e protegê-las com perfis, MFA, RLS e auditoria, **reaproveitando o que existe**. Mantenha os nomes de tabelas existentes e registre mapeamentos em `docs/manager-decisions.md`. Nunca exponha conteúdo de contratos dos clientes no manager.
> **Fase atual:** 0 — Diagnóstico. Não altere código. Gere `docs/manager-gap-report.md` e proponha a ordem das fases. Depois pare e aguarde aprovação.
