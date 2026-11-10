-- Modulo de Pagamentos -- corrige sync_subscription_to_organization(): paused
-- e expired deixam de cair no mesmo plan_status='trial' usado por Freemium
-- genuino, passando a usar 'suspended' (paga, mas sem acesso por falta de
-- pagamento). Isso evita a ambiguidade que ja tinha sido contornada com um
-- hack em useContracts.ts/parse-contract/index.ts (checar subscriptions.status
-- separadamente) e corrige bugs reais encontrados no PlanTab (plano pago
-- suspenso aparecia como "Assinar" de novo, clique ia pro checkout em vez de
-- billing-change-plan).

create or replace function public.sync_subscription_to_organization()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
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
    when 'paused' then 'suspended'
    when 'expired' then 'suspended'
    else 'trial'
  end;

  update public.organizations
  set plan_id = coalesce(v_plan_code, plan_id),
      plan_status = v_mapped_status,
      plan_renews_at = new.current_period_end
  where id = new.organization_id;

  return new;
end;
$function$;

-- Backfill: corrige organizacoes ja afetadas pelo mapeamento antigo, sem
-- esperar o proximo evento de assinatura pra re-disparar o trigger.
update public.organizations o
set plan_status = 'suspended'
from public.subscriptions s
where s.organization_id = o.id
  and s.status in ('paused', 'expired')
  and s.id = (
    select id from public.subscriptions
    where organization_id = o.id
    order by created_at desc
    limit 1
  )
  and o.plan_status = 'trial';
