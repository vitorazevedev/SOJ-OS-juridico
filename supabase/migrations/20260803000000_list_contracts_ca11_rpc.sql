-- CA-11 nas telas de lista: o embed automático do PostgREST usado hoje por
-- useContracts/useDashboard (contracts.select("...,contract_analyses(risk_score,...)"))
-- não pode ser redirecionado para uma view (contract_analyses_gated) porque não
-- há FK real entre contracts e uma view. A correção é expor o mesmo dado já
-- achatado e mascarado via função SECURITY DEFINER, seguindo o padrão de
-- get_admin_dashboard() (json_agg, set search_path, mascaramento por CASE WHEN
-- em vez de exceção — a exceção é só para controle de acesso admin).

create or replace function public.list_contracts()
returns json
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_org_id uuid := public.get_org_id();
  v_is_starter boolean;
  v_result json;
begin
  select (o.plan_status = 'active') into v_is_starter
  from public.organizations o where o.id = v_org_id;

  select coalesce(json_agg(row order by row.created_at desc), '[]'::json) into v_result
  from (
    select
      c.id, c.name, c.party, c.type, c.status, c.file_name, c.file_path,
      c.file_size, c.file_type, c.created_at, c.parsed_data,
      case when v_is_starter then ca.risk_score else null end as risk_score,
      case when v_is_starter then ca.indice_desequilibrio else null end as indice_desequilibrio
    from public.contracts c
    left join public.contract_analyses ca on ca.contract_id = c.id
    where c.org_id = v_org_id
  ) row;

  return v_result;
end;
$$;
grant execute on function public.list_contracts() to authenticated;

create or replace function public.list_recent_contracts(p_limit int default 20)
returns json
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_org_id uuid := public.get_org_id();
  v_is_starter boolean;
  v_result json;
begin
  select (o.plan_status = 'active') into v_is_starter
  from public.organizations o where o.id = v_org_id;

  select coalesce(json_agg(row order by row.created_at desc), '[]'::json) into v_result
  from (
    select
      c.id, c.name, c.party, c.type, c.status, c.created_at,
      case when v_is_starter then ca.risk_score else null end as risk_score,
      case when v_is_starter then ca.indice_desequilibrio else null end as indice_desequilibrio,
      ca.financial_total
    from public.contracts c
    left join public.contract_analyses ca on ca.contract_id = c.id
    where c.org_id = v_org_id
    order by c.created_at desc
    limit p_limit
  ) row;

  return v_result;
end;
$$;
grant execute on function public.list_recent_contracts(int) to authenticated;
