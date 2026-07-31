-- Adiciona receita real (billing_receipts, gerado no upgrade/renovacao
-- confirmados pela Equipe Ponderum) ao dashboard executivo, ao lado do
-- MRR estimado (que so multiplica contagem atual x preco atual e nao
-- reflete pagamentos de fato ocorridos). Aditivo: so acrescenta um campo
-- novo ao JSON de retorno, nao altera os existentes.

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
                           , 1),
      -- Em reais (nao centavos), igual a mrr_estimate acima -- mantem a mesma
      -- unidade dos demais campos deste RPC (fmtBRL do frontend nao divide por 100 aqui).
      'revenue_30d', (
        select coalesce(round(sum(amount_cents) / 100.0), 0)::int
        from billing_receipts
        where issued_at >= now() - interval '30 days'
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
             where date_trunc('month', o.created_at) = m.month_start), 0
          ) as new_orgs
        from (
          select date_trunc('month', current_date - (n || ' months')::interval) as month_start
          from generate_series(0, 5) as n
        ) m
      ) row
    ),

    -- Receita real confirmada (recibos emitidos na Equipe Ponderum), mes a
    -- mes -- contraponto ao MRR estimado, que e so uma projecao do
    -- numero atual de contas Starter x preco atual.
    'revenue_monthly', (
      select coalesce(json_agg(row order by row.month_start), '[]'::json)
      from (
        select
          m.month_start,
          to_char(m.month_start, 'Mon/YY') as month,
          coalesce(
            (select round(sum(br.amount_cents) / 100.0)::int from billing_receipts br
             where date_trunc('month', br.issued_at) = m.month_start), 0
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
