-- Atualiza get_admin_dashboard com: custo estimado, saúde do cron,
-- análises por dia (7 dias) e feed de atividade recente.
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
    where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  select json_build_object(

    -- ── Stats gerais ────────────────────────────────────────────────────
    'stats', json_build_object(
      'total_orgs',              (select count(*)::int from organizations),
      'total_contracts',         (select count(*)::int from contracts),
      'contracts_this_month',    (select count(*)::int from contracts
                                  where created_at >= date_trunc('month', now())),
      'total_analyses',          (select count(*)::int from contract_analyses),
      'analyses_this_month',     (select count(*)::int from contract_analyses
                                  where created_at >= date_trunc('month', now())),
      'total_feedbacks',         (select count(*)::int from user_feedback)
    ),

    -- ── Feedbacks ────────────────────────────────────────────────────────
    'feedbacks', (
      select coalesce(json_agg(row order by row.created_at desc), '[]'::json)
      from (
        select id, category, message, page_url, created_at
        from user_feedback
        order by created_at desc
        limit 50
      ) row
    ),

    -- ── Organizações ─────────────────────────────────────────────────────
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

    -- ── Análises por dia — últimos 7 dias ────────────────────────────────
    'analyses_per_day', (
      select coalesce(json_agg(row order by row.day), '[]'::json)
      from (
        select
          to_char(d.day, 'DD/MM') as day,
          coalesce(
            (select count(*)::int from contract_analyses ca
             where ca.created_at::date = d.day),
            0
          ) as count
        from generate_series(
          current_date - interval '6 days',
          current_date,
          interval '1 day'
        ) as d(day)
      ) row
    ),

    -- ── Feed de atividade recente (últimos 10 contratos em todas as orgs) ─
    'recent_contracts', (
      select coalesce(json_agg(row order by row.created_at desc), '[]'::json)
      from (
        select
          c.id, c.name, c.status, c.created_at,
          o.name as org_name
        from contracts c
        join organizations o on o.id = c.org_id
        order by c.created_at desc
        limit 10
      ) row
    ),

    -- ── Saúde das funções agendadas (últimas execuções de cada cron job) ─
    'cron_health', (
      select coalesce(json_agg(row order by row.jobname), '[]'::json)
      from (
        select distinct on (j.jobname)
          j.jobname,
          j.schedule,
          r.status,
          r.start_time,
          r.return_message
        from cron.job j
        left join cron.job_run_details r on r.jobid = j.jobid
        order by j.jobname, r.start_time desc nulls last
      ) row
    )

  ) into v_result;

  return v_result;
end;
$$;
