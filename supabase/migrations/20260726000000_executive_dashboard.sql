-- Fase 3 do painel "Equipe Ponderum": dashboard executivo (CEO/CFO) com
-- MRR estimado, clientes por plano, churn e crescimento ao longo do tempo.
--
-- Churn e MRR-ao-longo-do-tempo dependem de saber QUANDO uma organizacao
-- mudou de status (virou paga, foi rebaixada) -- so o estado atual nao
-- basta. Cria um historico alimentado por trigger a partir de agora (nao
-- da pra reconstruir transicoes que ja aconteceram no passado e nao foram
-- registradas).

create table if not exists public.organizations_status_history (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  previous_plan_status text,
  plan_status text not null,
  previous_blocked boolean,
  blocked boolean not null,
  changed_at timestamptz not null default now()
);

create index if not exists organizations_status_history_org_id_idx
  on public.organizations_status_history (org_id);
create index if not exists organizations_status_history_changed_at_idx
  on public.organizations_status_history (changed_at);

create or replace function public.log_organization_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.plan_status is distinct from old.plan_status or new.blocked is distinct from old.blocked then
    insert into public.organizations_status_history
      (org_id, previous_plan_status, plan_status, previous_blocked, blocked)
    values
      (new.id, old.plan_status, new.plan_status, old.blocked, new.blocked);
  end if;
  return new;
end;
$$;

drop trigger if exists organizations_status_change on public.organizations;
create trigger organizations_status_change
  after update on public.organizations
  for each row execute function public.log_organization_status_change();

-- MRR estimado: nao ha gateway de pagamento integrado ainda, entao o valor
-- e uma estimativa (nº de organizacoes pagando o Starter × preco fixo
-- atual do plano). Ver src/lib/pricing.ts para o mesmo valor no frontend.
create or replace function public.get_executive_dashboard()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result json;
  v_starter_price constant int := 490;
  v_starter_count int;
  v_freemium_count int;
  v_blocked_count int;
  v_churned_30d int;
begin
  if not exists (
    select 1 from public.users
    where id = auth.uid() and is_ponderum_staff = true
  ) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  select count(*) filter (where plan_status = 'active'),
         count(*) filter (where plan_status = 'trial'),
         count(*) filter (where blocked)
    into v_starter_count, v_freemium_count, v_blocked_count
    from organizations;

  select count(distinct org_id) into v_churned_30d
  from organizations_status_history
  where previous_plan_status = 'active'
    and plan_status = 'trial'
    and changed_at >= now() - interval '30 days';

  select json_build_object(

    'stats', json_build_object(
      'total_orgs',       v_starter_count + v_freemium_count,
      'starter_count',    v_starter_count,
      'freemium_count',   v_freemium_count,
      'blocked_count',    v_blocked_count,
      'mrr_estimate',     v_starter_count * v_starter_price,
      'churned_30d',      v_churned_30d,
      -- aproximacao: "ativos no inicio do periodo" ~= ativos agora + quem saiu no periodo
      'churn_rate_30d',   round(
                             v_churned_30d::numeric
                             / greatest(v_starter_count + v_churned_30d, 1) * 100
                           , 1)
    ),

    'growth_monthly', (
      select coalesce(json_agg(row order by row.month_start), '[]'::json)
      from (
        select
          m.month_start,
          to_char(m.month_start, 'Mon/YY') as month,
          coalesce(
            (select count(*)::int from organizations o
             where date_trunc('month', o.created_at) = m.month_start), 0
          ) as new_orgs
        from (
          select date_trunc('month', current_date - (n || ' months')::interval) as month_start
          from generate_series(0, 5) as n
        ) m
      ) row
    )

  ) into v_result;

  return v_result;
end;
$$;
