-- Modulo de Pagamentos, Fase 1 -- view organization_entitlements (spec
-- secao 4), fonte unica de verdade sobre "o que esta organizacao pode
-- usar". Ainda NAO consumida por nenhum codigo existente nesta fase
-- (parse-contract/analyze-contract/contract_analyses_gated continuam
-- lendo organizations.plan_id/plan_status direto ate uma fase futura de
-- migracao incremental, documentada em docs/billing-gap-report.md).
--
-- security_invoker=true desde a criacao -- sem isso a view roda com o
-- privilegio de quem a criou e ignora RLS de quem consulta, mesma classe
-- de bug ja encontrada e corrigida nesta sessao em contract_analyses_gated
-- (ver supabase/migrations/20260901000000_fix_gated_view_security_invoker.sql).
create view public.organization_entitlements
with (security_invoker = true)
as
select distinct on (s.organization_id)
  s.organization_id,
  s.status,
  bp.code as plan_code,
  bp.name as plan_name,
  bp.features,
  (bp.features->>'monthly_analysis_limit')::int as monthly_analysis_limit,
  (bp.features->>'max_users')::int as max_users,
  (
    s.status in ('trialing', 'active')
    or (s.status = 'past_due' and now() < s.grace_period_ends_at)
    or (s.status = 'canceled' and s.current_period_end is not null and now() < s.current_period_end)
  ) as has_access,
  s.current_period_end,
  s.cancel_at_period_end
from public.subscriptions s
join public.billing_plans bp on bp.id = s.plan_id
order by s.organization_id, s.created_at desc;

comment on view public.organization_entitlements is
  'Entitlement atual de cada organizacao, derivado da assinatura mais recente (Modulo de Pagamentos, spec secao 4). Consumidores existentes (gating de cota, contract_analyses_gated) ainda nao migrados para esta view nesta fase -- ver docs/billing-gap-report.md.';
