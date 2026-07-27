-- Fase 3 (parte 1): o KPI "Indice medio de Desequilibrio" no Dashboard usava
-- risk_score (formula antiga). Passa a usar indice_desequilibrio quando
-- disponivel, com fallback pra risk_score em analises legadas (sem
-- parte_representada), coalescendo por linha antes de tirar a media.

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
  coalesce(round(avg(la.indice_resolvido))::int, 0) as avg_risk_score,
  coalesce(sum(la.financial_total), 0)::bigint as total_exposure_cents,
  (
    select count(*)::int from public.contract_obligations o
    where o.org_id = c.org_id and o.status = 'pendente'
  ) as pending_obligations,
  (
    select count(*)::int from public.contract_obligations o
    where o.org_id = c.org_id
      and o.status = 'pendente'
      and o.due_date is not null
      and o.due_date <= (current_date + interval '7 days')
      and o.due_date >= current_date
  ) as urgent_obligations
from public.contracts c
left join latest_analysis la on la.contract_id = c.id
group by c.org_id;

grant select on public.dashboard_summary to authenticated, anon;
