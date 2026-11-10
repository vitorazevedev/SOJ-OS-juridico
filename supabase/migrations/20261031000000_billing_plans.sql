-- Modulo de Pagamentos, Fase 1 (docs/PAGAMENTOS_SPEC.md secao 4) -- tabela
-- de planos, primeira peca do modelo de dados completo da spec (decisao
-- registrada em docs/billing-decisions.md, Opcao A: adotar o modelo da
-- spec em vez de adaptar plan_id/plan_status como coluna).
--
-- Nomenclatura: as tabelas novas deste modulo seguem o nome de coluna
-- `organization_id` (nao `org_id`, convencao ja usada no resto do
-- projeto) -- decisao deliberada de seguir a spec ao pe da letra, ja que
-- "adotar o modelo completo" foi a escolha explicita do Vitor.

create table public.billing_plans (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  price_cents integer not null check (price_cents >= 0),
  interval text not null default 'month' check (interval in ('month','year')),
  trial_days integer not null default 0,
  features jsonb not null default '{}',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.billing_plans enable row level security;

-- Leitura publica de planos ativos -- a tela de precos (landing + app)
-- precisa listar os planos sem exigir autenticacao.
create policy billing_plans_select_active on public.billing_plans
  for select using (is_active = true);

-- Sem policy de insert/update/delete: so service_role (migrations/admin)
-- escreve aqui, igual ao padrao ja usado em outras tabelas de
-- configuracao do projeto.

comment on table public.billing_plans is
  'Catalogo de planos de assinatura (Modulo de Pagamentos, spec secao 4). Preco em centavos, nunca float (Principio 6 da spec).';

-- Seed com os valores REAIS ja decididos pelos socios (nao placeholder) --
-- ver docs/prd-mercadopago-checkout.md e src/lib/pricing.ts. `freemium`
-- substitui o plan_status='trial' de hoje; `starter` fica como legado,
-- ativo so para organizacoes que ja estao nele (novas assinaturas nao
-- usam mais este codigo).
insert into public.billing_plans (code, name, price_cents, trial_days, features, sort_order, is_active) values
  ('freemium',    'Teste Grátis', 0,       0, '{"monthly_analysis_limit": 1,   "max_users": 1}',  0, true),
  ('starter',     'Starter (legado)', 49000, 0, '{"monthly_analysis_limit": 15,  "max_users": 3}',  1, true),
  ('individual',  'Individual',   19900,   0, '{"monthly_analysis_limit": 5,   "max_users": 1}',  2, true),
  ('escritorio',  'Escritório',   49900,   0, '{"monthly_analysis_limit": 15,  "max_users": 3}',  3, true),
  ('juridico',    'Jurídico',     89900,   0, '{"monthly_analysis_limit": 40,  "max_users": 5}',  4, true),
  ('corporativo', 'Corporativo', 174900,   0, '{"monthly_analysis_limit": 100, "max_users": 10}', 5, true);
