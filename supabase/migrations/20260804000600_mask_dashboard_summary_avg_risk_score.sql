-- dashboard_summary.avg_risk_score nao mascarava por plano -- o KPI "Indice
-- medio de Desequilibrio" no Dashboard so escondia o valor na UI
-- (isStarter ? valor : "-"), mas o numero real ia inteiro na resposta da
-- query (visivel via DevTools/Network pra conta Freemium). Mesmo padrao ja
-- usado em contract_analyses_gated / list_contracts(): mascara por
-- plan_status = 'active' na propria view.

create or replace view public.dashboard_summary
with (security_invoker = on) as
with latest_analysis as (
  select distinct on (a.contract_id)
    a.contract_id,
    coalesce(a.indice_desequilibrio, a.risk_score) as indice_resolvido,
    a.financial_total
  from public.contract_analyses a
  order by a.contract_id, a.created_at desc
)
select
  c.org_id,
  count(*)::int as total_contracts,
  case
    when o.plan_status = 'active' then coalesce(round(avg(la.indice_resolvido))::int, 0)
    else 0
  end as avg_risk_score,
  coalesce(sum(la.financial_total), 0)::bigint as total_exposure_cents,
  (
    select count(*)::int from public.contract_obligations ob
    where ob.org_id = c.org_id and ob.status = 'pendente'
  ) as pending_obligations,
  (
    select count(*)::int from public.contract_obligations ob
    where ob.org_id = c.org_id
      and ob.status = 'pendente'
      and ob.due_date is not null
      and ob.due_date <= (current_date + interval '7 days')
      and ob.due_date >= current_date
  ) as urgent_obligations
from public.contracts c
join public.organizations o on o.id = c.org_id
left join latest_analysis la on la.contract_id = c.id
group by c.org_id, o.plan_status;

grant select on public.dashboard_summary to authenticated, anon;
