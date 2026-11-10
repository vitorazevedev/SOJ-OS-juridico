-- Modulo de Pagamentos, Fase 5a -- chargeback (spec Peca 8). Deixado
-- pendente desde a Fase 2 (ProviderChargeback nao tinha o vinculo com o
-- pagamento -- resolvido agora em provider.ts). organization_id aqui nao
-- esta na spec literal (secao 4), mas segue o mesmo padrao de todas as
-- outras tabelas do modulo (payments/subscriptions/billing_customers), pra
-- RLS simples.

create table public.chargebacks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  payment_id uuid not null references public.payments(id),
  provider_chargeback_id text not null,
  status text not null, -- opened | documentation_pending | won | lost
  amount_cents integer not null,
  reason text,
  documentation_due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_chargeback_id)
);

alter table public.chargebacks enable row level security;

create policy chargebacks_select on public.chargebacks
  for select using (organization_id = public.get_org_id());

-- Peca 8 (antifraude) -- sinal de tentativas de checkout por IP, pra
-- limitar "10 por IP em 1h". Log tecnico, sem policy de select (service_role).
create table public.checkout_attempts (
  id bigserial primary key,
  user_id uuid,
  organization_id uuid,
  ip inet,
  method text,
  outcome text,
  created_at timestamptz not null default now()
);

create index checkout_attempts_ip_idx on public.checkout_attempts(ip, created_at);

alter table public.checkout_attempts enable row level security;

-- true bloqueia pagamento com cartao pra essa organizacao (spec: "nao pode
-- reassinar com cartao sem liberacao do admin, so Pix") ate um staff
-- liberar pelo /admin.
alter table public.organizations add column risk_flagged boolean not null default false;

-- Mesmo padrao de staff_set_org_blocked (20260725000000_staff_org_management.sql).
create or replace function public.staff_set_org_risk_flag(
  p_org_id uuid,
  p_risk_flagged boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.users
    where id = auth.uid() and is_ponderum_staff = true
  ) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  update public.organizations set risk_flagged = p_risk_flagged where id = p_org_id;
end;
$$;

-- Mesma assinatura de list_staff_organizations (20260729000000), so
-- acrescenta risk_flagged -- CREATE OR REPLACE com parametros identicos
-- substitui no lugar, sem criar overload novo (licao ja aplicada nesta
-- sessao com claim_subscription_lock).
create or replace function public.list_staff_organizations(
  p_search text default null,
  p_page int default 1,
  p_page_size int default 10
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result json;
  v_offset int := greatest(p_page - 1, 0) * p_page_size;
  v_search text := nullif(trim(p_search), '');
begin
  if not exists (
    select 1 from public.users
    where id = auth.uid() and can_view_ponderum_team = true
  ) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  with base as (
    select
      o.id, o.name, o.cnpj, o.plan_id, o.plan_status, o.blocked, o.risk_flagged, o.created_at, o.plan_renews_at,
      u.name as admin_name, u.email as admin_email, u.phone as admin_phone
    from organizations o
    left join lateral (
      select name, email, phone
      from users
      where org_id = o.id and role = 'admin'
      order by created_at asc
      limit 1
    ) u on true
    where
      v_search is null
      or o.name ilike '%' || v_search || '%'
      or o.cnpj ilike '%' || v_search || '%'
      or u.name ilike '%' || v_search || '%'
      or u.email ilike '%' || v_search || '%'
      or u.phone ilike '%' || v_search || '%'
  )
  select json_build_object(
    'total', (select count(*)::int from base),
    'rows', coalesce((
      select json_agg(row order by row.created_at desc)
      from (
        select * from base
        order by created_at desc
        limit p_page_size offset v_offset
      ) row
    ), '[]'::json)
  ) into v_result;

  return v_result;
end;
$$;

-- Fase 5a -- lista chargebacks em aberto pro painel /admin (staff precisa
-- ver de todas as organizacoes; RLS de chargebacks restringe a leitura
-- comum a organization_id = get_org_id(), por isso via RPC security definer).
create or replace function public.list_open_chargebacks()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result json;
begin
  if not exists (
    select 1 from public.users
    where id = auth.uid() and is_ponderum_staff = true
  ) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  select coalesce(json_agg(row order by row.created_at desc), '[]'::json)
  into v_result
  from (
    select cb.id, cb.organization_id, o.name as organization_name, cb.amount_cents,
           cb.status, cb.reason, cb.documentation_due_at, cb.created_at
    from chargebacks cb
    join organizations o on o.id = cb.organization_id
    where cb.status = 'opened'
  ) row;

  return v_result;
end;
$$;
