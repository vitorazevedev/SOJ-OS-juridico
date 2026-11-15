-- Modulo de Cupom de Desconto, Etapa A -- reserva atomica de resgate.
-- Mesmo espirito de claim_subscription_lock (20261101000000): "select ...
-- for update" na linha que decide o limite, pra serializar corrida entre
-- dois checkouts simultaneos tentando o ultimo uso disponivel do cupom.
-- A validacao de REGRA (plano permitido, metodo permitido, novo cliente,
-- janela de validade) acontece ANTES desta chamada, em validateCoupon()
-- (_shared/billing/domain/coupons.ts) -- esta funcao so garante a contagem
-- atomica de limite de uso (max_redemptions/max_per_organization).

create or replace function public.redeem_coupon(
  p_coupon_id uuid,
  p_organization_id uuid,
  p_subscription_id uuid,
  p_full_amount_cents integer,
  p_discounted_amount_cents integer,
  p_cycles_total integer,
  p_discount_snapshot jsonb
) returns public.coupon_redemptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coupon record;
  v_total_count integer;
  v_org_count integer;
  v_result public.coupon_redemptions;
begin
  select * into v_coupon from coupons where id = p_coupon_id for update;
  if not found or not v_coupon.is_active then
    raise exception 'coupon_not_available';
  end if;

  select count(*) into v_total_count from coupon_redemptions where coupon_id = p_coupon_id;
  if v_coupon.max_redemptions is not null and v_total_count >= v_coupon.max_redemptions then
    raise exception 'coupon_exhausted';
  end if;

  select count(*) into v_org_count from coupon_redemptions
    where coupon_id = p_coupon_id and organization_id = p_organization_id;
  if v_org_count >= v_coupon.max_per_organization then
    raise exception 'coupon_already_used_by_org';
  end if;

  insert into coupon_redemptions (
    coupon_id, organization_id, subscription_id, discount_snapshot,
    full_amount_cents, discounted_amount_cents, cycles_total
  ) values (
    p_coupon_id, p_organization_id, p_subscription_id, p_discount_snapshot,
    p_full_amount_cents, p_discounted_amount_cents, p_cycles_total
  ) returning * into v_result;

  return v_result;
end;
$$;

-- Service role bypassa RLS/grants por padrao; o revoke explicito pra PUBLIC
-- e necessario -- authenticated/anon herdam de PUBLIC mesmo sem grant
-- direto (mesma licao ja aplicada em claim_subscription_lock).
revoke all on function public.redeem_coupon(uuid, uuid, uuid, integer, integer, integer, jsonb) from public, authenticated, anon;
