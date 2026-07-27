-- Fase 3 (parte 2, CA-11): ate agora o bloqueio do Indice de Desequilibrio pro
-- Freemium era so visual (RiskBadge locked) -- o valor real de risk_score/
-- indice_desequilibrio sempre ia no payload de contract_analyses, visivel na
-- aba de rede do navegador. RLS do Postgres nao mascara colunas, so libera ou
-- nega a linha inteira, entao a correcao e uma view com security_invoker (mesmo
-- padrao ja usado em dashboard_summary) que zera esses campos quando a
-- organizacao nao esta no plano Starter (plan_status != 'active').
--
-- Escopo: so a pagina de analise do contrato (useContractAnalysis.ts) passa a
-- usar essa view. As telas de lista (ContractsList/Dashboard/RecentContracts)
-- continuam com o embed direto do PostgREST em contracts(contract_analyses(...)),
-- que nao consegue apontar pra uma view sem FK -- ficam de fora deste escopo.

create or replace view public.contract_analyses_gated
with (security_invoker = on) as
select
  ca.id,
  ca.contract_id,
  ca.summary,
  ca.financial_total,
  ca.financial_impact,
  ca.status,
  ca.model_used,
  ca.prompt_version,
  ca.tokens_input,
  ca.tokens_output,
  ca.cost_usd,
  ca.analyzed_at,
  ca.created_at,
  ca.parte_representada,
  case when o.plan_status = 'active' then ca.risk_score else null end as risk_score,
  case when o.plan_status = 'active' then ca.risk_level else null end as risk_level,
  case when o.plan_status = 'active' then ca.indice_desequilibrio else null end as indice_desequilibrio
from public.contract_analyses ca
join public.contracts c on c.id = ca.contract_id
join public.organizations o on o.id = c.org_id;

grant select on public.contract_analyses_gated to authenticated;
