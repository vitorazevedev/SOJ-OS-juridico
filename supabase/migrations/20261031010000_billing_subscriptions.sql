-- Modulo de Pagamentos, Fase 1 -- tabela subscriptions (spec secao 4),
-- fonte da verdade nova para o estado de assinatura. organizations.plan_id/
-- plan_status continuam existindo (ponte de sincronizacao na proxima
-- migration), mas deixam de ser a fonte primaria a partir daqui.

create type public.subscription_status as enum
  ('incomplete','trialing','active','past_due','paused','canceled','expired');

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  plan_id uuid not null references public.billing_plans(id),
  status public.subscription_status not null default 'incomplete',
  payment_method text check (payment_method in ('card','pix')),
  provider text not null default 'manual',
  provider_subscription_id text,
  billing_day smallint not null check (billing_day between 1 and 28),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  cancel_reason text,
  past_due_since timestamptz,
  grace_period_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_subscription_id)
);

-- No maximo 1 assinatura "viva" por organizacao (spec secao 4).
create unique index one_live_subscription_per_org on public.subscriptions(organization_id)
  where status in ('incomplete','trialing','active','past_due','paused');

alter table public.subscriptions enable row level security;

create policy subscriptions_select on public.subscriptions
  for select using (organization_id = public.get_org_id());

-- Sem policy de insert/update/delete para authenticated: toda escrita de
-- status passa por service_role (Edge Functions), igual ao Principio 2 da
-- spec ("o webhook e a unica fonte da verdade").

comment on table public.subscriptions is
  'Assinatura de uma organizacao (Modulo de Pagamentos, spec secao 4/5). Maquina de estados completa -- ver supabase/functions/_shared/billing/domain/subscriptions.ts.';

-- -----------------------------------------------------------------------
-- Backfill: 1 linha de subscriptions por organizacao existente, derivada
-- do estado atual de organizations.plan_id/plan_status. Nao ha dado de
-- assinatura real do Mercado Pago a migrar -- organization_mercadopago_
-- subscriptions (Story 1.1) esta vazia, confirmado antes desta migration.
--
-- Mapeamento: plan_status='trial' -> status='trialing', plan='freemium'
-- (plan_id de organizations e vestigial durante trial, sempre 'starter'
-- por default, nao reflete nada real nesse estado). plan_status='active'
-- -> status='active', plan = o proprio plan_id da organizacao.
-- billing_day derivado do dia de plan_renews_at quando existir, senao do
-- dia de created_at, senao 1.
-- -----------------------------------------------------------------------
insert into public.subscriptions
  (organization_id, plan_id, status, provider, billing_day, current_period_start, current_period_end)
select
  o.id,
  case
    when o.plan_status = 'active' then
      coalesce(
        (select bp.id from public.billing_plans bp where bp.code = o.plan_id),
        (select bp.id from public.billing_plans bp where bp.code = 'starter')
      )
    else
      (select bp.id from public.billing_plans bp where bp.code = 'freemium')
  end as plan_id,
  case when o.plan_status = 'active' then 'active'::public.subscription_status
       else 'trialing'::public.subscription_status
  end as status,
  'manual' as provider,
  least(coalesce(extract(day from o.plan_renews_at)::smallint, extract(day from o.created_at)::smallint, 1), 28) as billing_day,
  case when o.plan_status = 'active' then o.created_at else null end as current_period_start,
  o.plan_renews_at as current_period_end
from public.organizations o;
