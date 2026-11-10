-- Modulo de Pagamentos, Fase 3 -- Realtime em payments/subscriptions (pra
-- CheckoutResult/PixPaymentPage reagirem sozinhas ao webhook) + trava de
-- criacao de assinatura com staleness (licao herdada da Story 1.2: o
-- indice one_live_subscription_per_org sozinho, sem reclaim, trava a
-- organizacao pra sempre se a Edge Function cair no meio -- mesma classe
-- do incidente real da Matrix nesta sessao).

alter publication supabase_realtime add table public.payments;
alter publication supabase_realtime add table public.subscriptions;

-- Cria uma subscriptions 'incomplete' nova, OU reclama uma 'incomplete'
-- existente SO SE ela nao tem provider_subscription_id e foi criada ha
-- mais de 5 minutos (nunca reclama trialing/active/past_due/paused reais).
-- Devolve o id da linha, ou null se bloqueado por uma assinatura viva nao
-- reclamavel (a organizacao ja tem assinatura).
create or replace function public.claim_subscription_lock(
  p_organization_id uuid,
  p_plan_id uuid,
  p_provider text,
  p_payment_method text,
  p_billing_day smallint
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing record;
  v_id uuid;
begin
  select id, status, provider_subscription_id, created_at
    into v_existing
    from subscriptions
    where organization_id = p_organization_id
      and status in ('incomplete','trialing','active','past_due','paused')
    limit 1;

  if v_existing is null then
    insert into subscriptions (organization_id, plan_id, status, provider, payment_method, billing_day)
    values (p_organization_id, p_plan_id, 'incomplete', p_provider, p_payment_method, p_billing_day)
    returning id into v_id;
    return v_id;
  end if;

  if v_existing.status = 'incomplete'
     and v_existing.provider_subscription_id is null
     and v_existing.created_at < now() - interval '5 minutes' then
    update subscriptions
      set plan_id = p_plan_id,
          provider = p_provider,
          payment_method = p_payment_method,
          billing_day = p_billing_day,
          created_at = now(),
          updated_at = now()
      where id = v_existing.id
      returning id into v_id;
    return v_id;
  end if;

  return null;
end;
$$;

-- Service role bypassa RLS/grants por padrao; o revoke explicito e pra
-- PUBLIC e necessario -- authenticated/anon herdam de PUBLIC mesmo sem
-- grant direto (licao ja aplicada nesta sessao em outra funcao).
revoke all on function public.claim_subscription_lock(uuid, uuid, text, text, smallint) from public, authenticated, anon;
