-- Lucro Bruto (30d) no Painel Executivo = Receita Real (30d) - Custo de IA
-- (30d). Faltava o lado do custo nesse painel (o custo real por tokens só
-- existia no Painel Dev, calculado por mês corrente). Adiciona os somatórios
-- de tokens dos últimos 30 dias, já excluindo contratos/análises de
-- organizações da Equipe Ponderum -- o preço por token continua calculado
-- no frontend (adminDashboard.ts), este RPC só entrega o uso real.

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
      ),
      'parse_tokens_input_30d', (
        select coalesce(sum(cc.tokens_input), 0)::bigint
        from contract_contents cc
        join contracts c on c.id = cc.contract_id
        where cc.parsed_at >= now() - interval '30 days'
          and not exists (
            select 1 from public.users u
            where u.org_id = c.org_id and u.is_ponderum_staff = true
          )
      ),
      'parse_tokens_output_30d', (
        select coalesce(sum(cc.tokens_output), 0)::bigint
        from contract_contents cc
        join contracts c on c.id = cc.contract_id
        where cc.parsed_at >= now() - interval '30 days'
          and not exists (
            select 1 from public.users u
            where u.org_id = c.org_id and u.is_ponderum_staff = true
          )
      ),
      'analysis_tokens_input_30d', (
        select coalesce(sum(ca.tokens_input), 0)::bigint
        from contract_analyses ca
        join contracts c on c.id = ca.contract_id
        where ca.created_at >= now() - interval '30 days'
          and not exists (
            select 1 from public.users u
            where u.org_id = c.org_id and u.is_ponderum_staff = true
          )
      ),
      'analysis_tokens_output_30d', (
        select coalesce(sum(ca.tokens_output), 0)::bigint
        from contract_analyses ca
        join contracts c on c.id = ca.contract_id
        where ca.created_at >= now() - interval '30 days'
          and not exists (
            select 1 from public.users u
            where u.org_id = c.org_id and u.is_ponderum_staff = true
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
