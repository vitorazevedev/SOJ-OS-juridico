-- Contas Starter (active) criadas antes do campo plan_renews_at existir
-- ficariam sem data de renovacao e sem contagem regressiva. Da pra
-- assumir 30 dias a partir de agora (nao ha como saber a data real do
-- ciclo de cada uma sem historico de pagamento).
update public.organizations
set plan_renews_at = now() + interval '30 days'
where plan_status = 'active' and plan_renews_at is null;
