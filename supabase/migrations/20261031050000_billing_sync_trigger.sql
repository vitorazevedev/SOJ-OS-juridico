-- Modulo de Pagamentos, Fase 1 -- ponte de sincronizacao TEMPORARIA
-- subscriptions -> organizations. Os ~22 arquivos que hoje leem
-- organizations.plan_id/plan_status direto (gating de cota em
-- parse-contract/analyze-contract, a view contract_analyses_gated, varias
-- telas do admin/app -- lista completa em docs/billing-gap-report.md) NAO
-- sao migrados nesta fase. Este trigger mantem os dois modelos
-- consistentes enquanto isso nao acontece: toda escrita em subscriptions
-- (fonte da verdade nova) reflete automaticamente nas colunas antigas,
-- sem exigir cutover de uma vez em todos os consumidores.
--
-- REMOVER quando os consumidores antigos forem migrados para ler de
-- organization_entitlements/subscriptions diretamente.
--
-- Mapeamento status -> plan_status binario (organizations so tem
-- trial/active, sem conceito de "pausado" separado de blocked):
--   incomplete, trialing, canceled, expired -> 'trial' (sem acesso pago)
--   active, past_due                         -> 'active' (past_due ainda
--     mantem acesso durante a carencia, conforme a maquina de estados da
--     spec secao 5 -- so perde acesso em 'paused')
--   paused                                   -> 'trial' (sem acesso,
--     equivalente ao "paused (sem acesso)" da spec)
create or replace function public.sync_subscription_to_organization()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_latest boolean;
  v_plan_code text;
  v_mapped_status text;
begin
  select (s.id = new.id) into v_is_latest
  from public.subscriptions s
  where s.organization_id = new.organization_id
  order by s.created_at desc
  limit 1;

  if not coalesce(v_is_latest, false) then
    return new;
  end if;

  select code into v_plan_code from public.billing_plans where id = new.plan_id;

  v_mapped_status := case new.status
    when 'active' then 'active'
    when 'past_due' then 'active'
    else 'trial'
  end;

  update public.organizations
  set plan_id = coalesce(v_plan_code, plan_id),
      plan_status = v_mapped_status,
      plan_renews_at = new.current_period_end
  where id = new.organization_id;

  return new;
end;
$$;

create trigger subscriptions_sync_to_organizations
  after insert or update on public.subscriptions
  for each row
  execute function public.sync_subscription_to_organization();

comment on function public.sync_subscription_to_organization is
  'Ponte temporaria de sincronizacao subscriptions -> organizations.plan_id/plan_status, enquanto os consumidores legados nao sao migrados. Remover junto com o cutover incremental (ver docs/billing-gap-report.md).';
