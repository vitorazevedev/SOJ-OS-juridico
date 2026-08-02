-- Organizações da própria Equipe Ponderum (contas usadas para testar a
-- plataforma) estavam sendo contadas como clientes reais no Painel
-- Executivo (MRR estimado, Receita real, Clientes por plano, Churn) --
-- inflando os números. Uma org é "da equipe" quando algum de seus
-- usuários tem is_ponderum_staff = true; essas orgs passam a ser
-- excluídas de todo o cálculo de get_executive_dashboard().

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

  select count(*) filter (where o.plan_status = 'active'),
         count(*) filter (where o.plan_status = 'trial'),
         count(*) filter (where o.blocked)
    into v_starter_count, v_freemium_count, v_blocked_count
    from organizations o
    where not exists (
      select 1 from public.users u
      where u.org_id = o.id and u.is_ponderum_staff = true
    );

  select count(distinct h.org_id) into v_churned_30d
  from organizations_status_history h
  where h.previous_plan_status = 'active'
    and h.plan_status = 'trial'
    and h.changed_at >= now() - interval '30 days'
    and not exists (
      select 1 from public.users u
      where u.org_id = h.org_id and u.is_ponderum_staff = true
    );

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
                           , 1),
      'revenue_30d', (
        select coalesce(round(sum(br.amount_cents) / 100.0), 0)::int
        from billing_receipts br
        join organizations o on o.id = br.org_id
        where br.issued_at >= now() - interval '30 days'
          and not exists (
            select 1 from public.users u
            where u.org_id = o.id and u.is_ponderum_staff = true
          )
      )
    ),

    'growth_monthly', (
      select coalesce(json_agg(row order by row.month_start), '[]'::json)
      from (
        select
          m.month_start,
          to_char(m.month_start, 'Mon/YY') as month,
          coalesce(
            (select count(*)::int from organizations o
             where date_trunc('month', o.created_at) = m.month_start
               and not exists (
                 select 1 from public.users u
                 where u.org_id = o.id and u.is_ponderum_staff = true
               )
            ), 0
          ) as new_orgs
        from (
          select date_trunc('month', current_date - (n || ' months')::interval) as month_start
          from generate_series(0, 5) as n
        ) m
      ) row
    ),

    'revenue_monthly', (
      select coalesce(json_agg(row order by row.month_start), '[]'::json)
      from (
        select
          m.month_start,
          to_char(m.month_start, 'Mon/YY') as month,
          coalesce(
            (select round(sum(br.amount_cents) / 100.0)::int
             from billing_receipts br
             join organizations o on o.id = br.org_id
             where date_trunc('month', br.issued_at) = m.month_start
               and not exists (
                 select 1 from public.users u
                 where u.org_id = o.id and u.is_ponderum_staff = true
               )
            ), 0
          ) as revenue
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
