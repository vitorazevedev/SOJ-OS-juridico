-- Area de gestao da Equipe Ponderum, dentro do Menu Dev. Ate agora,
-- is_ponderum_staff era um unico booleano liberando os menus "Dev" e
-- "Equipe Ponderum" juntos. Passa a existir permissao granular e
-- independente por membro:
--   can_view_dev             -> menu "Dev" (painel do desenvolvedor)
--   can_view_ponderum_team   -> menu "Equipe Ponderum"
--   full_platform_access     -> usa a plataforma normalmente, como um
--                                cliente (Dashboard/Contratos/Analise/...);
--                                sem isso, o membro so ve os menus internos
--                                que tiver
-- is_ponderum_staff continua existindo como a flag "esta na lista da
-- equipe Ponderum" (usada pra listar/gerenciar membros), mas deixa de
-- ser, sozinha, o que libera qualquer tela -- isso agora e feito pelas
-- 3 colunas acima.

alter table public.users
  add column if not exists staff_job_title text,
  add column if not exists can_view_dev boolean not null default false,
  add column if not exists can_view_ponderum_team boolean not null default false,
  add column if not exists full_platform_access boolean not null default false;

-- Backfill: quem ja era is_ponderum_staff tinha acesso aos dois menus
-- (comportamento antigo, unico), entao mantem equivalente.
update public.users
set can_view_dev = true, can_view_ponderum_team = true
where is_ponderum_staff = true and not can_view_dev and not can_view_ponderum_team;

-- get_admin_dashboard() agora exige especificamente can_view_dev (nao so
-- is_ponderum_staff, que passa a significar apenas "faz parte da equipe").
create or replace function public.get_admin_dashboard()
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
    where id = auth.uid() and can_view_dev = true
  ) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  select json_build_object(

    'stats', json_build_object(
      'total_orgs',              (select count(*)::int from organizations),
      'total_contracts',         (select count(*)::int from contracts),
      'contracts_this_month',    (select count(*)::int from contracts
                                  where created_at >= date_trunc('month', now())),
      'total_analyses',          (select count(*)::int from contract_analyses),
      'analyses_this_month',     (select count(*)::int from contract_analyses
                                  where created_at >= date_trunc('month', now())),
      'total_feedbacks',         (select count(*)::int from user_feedback),
      'total_waitlist',          (select count(*)::int from waitlist)
    ),

    'feedbacks', (
      select coalesce(json_agg(row order by row.created_at desc), '[]'::json)
      from (
        select id, category, message, page_url, created_at
        from user_feedback
        order by created_at desc limit 50
      ) row
    ),

    'organizations', (
      select coalesce(json_agg(row order by row.created_at desc), '[]'::json)
      from (
        select
          o.id, o.name, o.plan_id, o.created_at,
          (select count(*)::int from contracts c where c.org_id = o.id) as contract_count,
          (select count(*)::int from contracts c
           join contract_analyses ca on ca.contract_id = c.id
           where c.org_id = o.id) as analysis_count
        from organizations o
        order by o.created_at desc
      ) row
    ),

    'analyses_per_day', (
      select coalesce(json_agg(row order by row.day), '[]'::json)
      from (
        select
          to_char(d.day, 'DD/MM') as day,
          coalesce(
            (select count(*)::int from contract_analyses ca
             where ca.created_at::date = d.day), 0
          ) as count
        from generate_series(
          current_date - interval '6 days', current_date, interval '1 day'
        ) as d(day)
      ) row
    ),

    'recent_contracts', (
      select coalesce(json_agg(row order by row.created_at desc), '[]'::json)
      from (
        select c.id, c.name, c.status, c.created_at, o.name as org_name
        from contracts c
        join organizations o on o.id = c.org_id
        order by c.created_at desc limit 10
      ) row
    ),

    'cron_health', (
      select coalesce(json_agg(row order by row.jobname), '[]'::json)
      from (
        select distinct on (j.jobname)
          j.jobname, j.schedule, r.status, r.start_time, r.return_message
        from cron.job j
        left join cron.job_run_details r on r.jobid = j.jobid
        order by j.jobname, r.start_time desc nulls last
      ) row
    ),

    'waitlist', (
      select coalesce(json_agg(row order by row.created_at desc), '[]'::json)
      from (
        select id, name, email, phone, company, role, message, source, created_at
        from waitlist
        order by created_at desc limit 100
      ) row
    )

  ) into v_result;

  return v_result;
end;
$$;

-- As funcoes do menu "Equipe Ponderum" passam a exigir
-- can_view_ponderum_team (nao mais is_ponderum_staff genericamente).
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
      o.id, o.name, o.cnpj, o.plan_id, o.plan_status, o.blocked, o.created_at, o.plan_renews_at,
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

create or replace function public.staff_set_org_plan_status(
  p_org_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_was_active boolean;
begin
  if not exists (
    select 1 from public.users
    where id = auth.uid() and can_view_ponderum_team = true
  ) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  if p_status not in ('trial', 'active') then
    raise exception 'Status de plano inválido' using errcode = '22023';
  end if;

  select (plan_status = 'active') into v_was_active from organizations where id = p_org_id;

  update public.organizations
  set plan_status = p_status,
      plan_renews_at = case
        when p_status = 'active' and (plan_renews_at is null or plan_renews_at < now())
          then now() + interval '30 days'
        when p_status = 'trial' then null
        else plan_renews_at
      end
  where id = p_org_id;

  if p_status = 'active' and not coalesce(v_was_active, false) then
    insert into public.billing_receipts (org_id, amount_cents, description)
    values (p_org_id, 49000, 'Primeiro pagamento — Plano Starter');
  end if;
end;
$$;

create or replace function public.staff_set_org_blocked(
  p_org_id uuid,
  p_blocked boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.users
    where id = auth.uid() and can_view_ponderum_team = true
  ) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  update public.organizations set blocked = p_blocked where id = p_org_id;
end;
$$;

create or replace function public.staff_renew_org_subscription(
  p_org_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.users
    where id = auth.uid() and can_view_ponderum_team = true
  ) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  update public.organizations
  set plan_renews_at = now() + interval '30 days'
  where id = p_org_id and plan_status = 'active';

  insert into public.billing_receipts (org_id, amount_cents, description)
  select p_org_id, 49000, 'Renovação mensal — Plano Starter'
  where exists (select 1 from organizations where id = p_org_id and plan_status = 'active');
end;
$$;

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
    where id = auth.uid() and can_view_ponderum_team = true
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

-- Gestao dos membros da Equipe Ponderum, restrita a can_view_dev (fica
-- dentro do Menu Dev, nao do Menu Equipe Ponderum).
create or replace function public.list_ponderum_staff()
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
    where id = auth.uid() and can_view_dev = true
  ) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  select coalesce(json_agg(row order by row.created_at desc), '[]'::json)
  into v_result
  from (
    select
      id, name, email, phone, staff_job_title,
      can_view_dev, can_view_ponderum_team, full_platform_access, created_at
    from users
    where is_ponderum_staff = true
  ) row;

  return v_result;
end;
$$;

create or replace function public.staff_update_member_permissions(
  p_user_id uuid,
  p_job_title text,
  p_can_view_dev boolean,
  p_can_view_ponderum_team boolean,
  p_full_platform_access boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.users
    where id = auth.uid() and can_view_dev = true
  ) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  update public.users
  set staff_job_title = p_job_title,
      can_view_dev = p_can_view_dev,
      can_view_ponderum_team = p_can_view_ponderum_team,
      full_platform_access = p_full_platform_access
  where id = p_user_id and is_ponderum_staff = true;
end;
$$;
