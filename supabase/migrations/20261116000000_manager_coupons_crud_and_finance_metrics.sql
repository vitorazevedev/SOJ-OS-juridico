-- Modulo de Cupom de Desconto, Etapa C (docs/CUPOM_SPEC.md, secao 7 e 7.1).
-- RPCs de CRUD de cupom (financeiro/owner editam, equipe so consulta) e o
-- painel de GMV/NMV (financeiro/owner), mesmo padrao security definer +
-- has_staff_role + log_staff_action ja usado em staff_renew_org_subscription
-- etc. (migration 20261111000001).

-- 1) get_admin_finance_summary/list_admin_payments passam a aceitar owner
-- tambem, nao so financeiro (preciso disso pra /financeiro aceitar owner).

create or replace function public.get_admin_finance_summary()
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_result json;
  v_month_start timestamptz := date_trunc('month', now());
begin
  if not (public.has_staff_role('financeiro') or public.has_staff_role('owner')) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  select json_build_object(
    'sold_cents_month', coalesce((select sum(amount_cents) from payments where status = 'approved' and approved_at >= v_month_start), 0),
    'fee_cents_month', coalesce((select sum(fee_cents) from payments where status = 'approved' and approved_at >= v_month_start), 0),
    'net_cents_month', coalesce((select sum(net_cents) from payments where status = 'approved' and approved_at >= v_month_start), 0),
    'to_release_cents', coalesce((select sum(net_cents) from payments where status = 'approved' and released = false), 0),
    'released_cents', coalesce((select sum(net_cents) from payments where status = 'approved' and released = true), 0),
    'mrr_cents', coalesce((
      select sum(bp.price_cents) from subscriptions s join billing_plans bp on bp.id = s.plan_id where s.status = 'active'
    ), 0),
    'active_subscribers', coalesce((select count(*) from subscriptions where status = 'active'), 0),
    'past_due_subscribers', coalesce((select count(*) from subscriptions where status = 'past_due'), 0),
    'churn_month', coalesce((
      select count(*) from billing_audit_log
      where entity = 'subscription' and to_status in ('canceled', 'expired') and created_at >= v_month_start
    ), 0),
    'open_chargebacks', coalesce((select count(*) from chargebacks where status = 'opened'), 0)
  ) into v_result;

  return v_result;
end;
$function$;

create or replace function public.list_admin_payments(p_limit integer default 200)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_result json;
begin
  if not (public.has_staff_role('financeiro') or public.has_staff_role('owner')) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  select coalesce(json_agg(row order by row.created_at desc), '[]'::json)
  into v_result
  from (
    select p.id, o.name as organization_name, p.method, p.status, p.amount_cents,
           p.fee_cents, p.net_cents, p.money_release_date, p.released, p.approved_at, p.created_at
    from payments p
    join organizations o on o.id = p.organization_id
    order by p.created_at desc
    limit p_limit
  ) row;

  return v_result;
end;
$function$;

-- 2) CRUD de cupom (lista = financeiro/owner/equipe, mutacao = so financeiro/owner)

create or replace function public.list_coupons()
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_result json;
begin
  if not (public.has_staff_role('financeiro') or public.has_staff_role('owner') or public.has_staff_role('equipe')) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  select coalesce(json_agg(row order by row.created_at desc), '[]'::json) into v_result
  from (
    select
      c.id, c.code, c.description, c.discount_type, c.discount_value, c.duration, c.duration_cycles,
      c.valid_from, c.valid_until, c.max_redemptions, c.max_per_organization, c.allowed_plans,
      c.allowed_methods, c.new_customers_only, c.is_active, c.created_at,
      coalesce(r.redemptions_count, 0) as redemptions_count,
      coalesce(r.revenue_cents, 0) as revenue_cents,
      coalesce(r.discount_granted_cents, 0) as discount_granted_cents
    from coupons c
    left join (
      select cr.coupon_id,
        count(*) as redemptions_count,
        sum(coalesce(p.amount_cents, 0)) as revenue_cents,
        sum(coalesce(p.discount_cents, 0)) as discount_granted_cents
      from coupon_redemptions cr
      left join payments p on p.coupon_redemption_id = cr.id and p.status = 'approved'
      group by cr.coupon_id
    ) r on r.coupon_id = c.id
  ) row;

  return v_result;
end;
$function$;

create or replace function public.create_coupon(
  p_code text,
  p_discount_type text,
  p_discount_value integer,
  p_duration text,
  p_duration_cycles integer default null,
  p_valid_from timestamptz default now(),
  p_valid_until timestamptz default null,
  p_max_redemptions integer default null,
  p_max_per_organization integer default 1,
  p_allowed_plans text[] default '{}',
  p_allowed_methods text[] default '{card,pix}',
  p_new_customers_only boolean default false,
  p_description text default null
)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_coupon coupons;
begin
  if not (public.has_staff_role('financeiro') or public.has_staff_role('owner')) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  insert into coupons (
    code, description, discount_type, discount_value, duration, duration_cycles,
    valid_from, valid_until, max_redemptions, max_per_organization, allowed_plans,
    allowed_methods, new_customers_only, created_by
  ) values (
    upper(p_code), p_description, p_discount_type, p_discount_value, p_duration, p_duration_cycles,
    p_valid_from, p_valid_until, p_max_redemptions, p_max_per_organization, p_allowed_plans,
    p_allowed_methods, p_new_customers_only, auth.uid()
  )
  returning * into v_coupon;

  perform public.log_staff_action('create_coupon', 'coupon', v_coupon.id::text, jsonb_build_object('code', v_coupon.code));

  return row_to_json(v_coupon);
end;
$function$;

create or replace function public.update_coupon(
  p_id uuid,
  p_description text default null,
  p_valid_until timestamptz default null,
  p_max_redemptions integer default null,
  p_max_per_organization integer default null,
  p_is_active boolean default null,
  p_discount_type text default null,
  p_discount_value integer default null,
  p_duration text default null,
  p_duration_cycles integer default null
)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_has_redemptions boolean;
  v_coupon coupons;
begin
  if not (public.has_staff_role('financeiro') or public.has_staff_role('owner')) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  select exists(select 1 from coupon_redemptions where coupon_id = p_id) into v_has_redemptions;

  -- Spec secao 7: "Edicao de cupom ja resgatado so altera campos de
  -- resgate futuro (validade, limite, ativo). Desconto e duracao ficam
  -- bloqueados; para mudar, criar outro cupom."
  if v_has_redemptions and (p_discount_type is not null or p_discount_value is not null or p_duration is not null or p_duration_cycles is not null) then
    raise exception 'coupon_locked_has_redemptions' using errcode = '22023';
  end if;

  update coupons set
    description = coalesce(p_description, description),
    valid_until = coalesce(p_valid_until, valid_until),
    max_redemptions = coalesce(p_max_redemptions, max_redemptions),
    max_per_organization = coalesce(p_max_per_organization, max_per_organization),
    is_active = coalesce(p_is_active, is_active),
    discount_type = case when v_has_redemptions then discount_type else coalesce(p_discount_type, discount_type) end,
    discount_value = case when v_has_redemptions then discount_value else coalesce(p_discount_value, discount_value) end,
    duration = case when v_has_redemptions then duration else coalesce(p_duration, duration) end,
    duration_cycles = case when v_has_redemptions then duration_cycles else coalesce(p_duration_cycles, duration_cycles) end
  where id = p_id
  returning * into v_coupon;

  if v_coupon is null then
    raise exception 'coupon_not_found';
  end if;

  perform public.log_staff_action('update_coupon', 'coupon', p_id::text, jsonb_strip_nulls(jsonb_build_object(
    'description', p_description, 'valid_until', p_valid_until, 'max_redemptions', p_max_redemptions,
    'max_per_organization', p_max_per_organization, 'is_active', p_is_active, 'discount_type', p_discount_type,
    'discount_value', p_discount_value, 'duration', p_duration, 'duration_cycles', p_duration_cycles
  )));

  return row_to_json(v_coupon);
end;
$function$;

create or replace function public.set_coupon_active(p_id uuid, p_is_active boolean)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not (public.has_staff_role('financeiro') or public.has_staff_role('owner')) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  update coupons set is_active = p_is_active where id = p_id;

  perform public.log_staff_action('set_coupon_active', 'coupon', p_id::text, jsonb_build_object('is_active', p_is_active));
end;
$function$;

create or replace function public.get_coupon_redemptions(p_coupon_id uuid)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_result json;
begin
  if not (public.has_staff_role('financeiro') or public.has_staff_role('owner') or public.has_staff_role('equipe')) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  select coalesce(json_agg(row order by row.created_at desc), '[]'::json) into v_result
  from (
    select cr.id, o.name as organization_name, cr.status, cr.cycles_total, cr.cycles_used,
           cr.full_amount_cents, cr.discounted_amount_cents, cr.created_at, cr.completed_at
    from coupon_redemptions cr
    join organizations o on o.id = cr.organization_id
    where cr.coupon_id = p_coupon_id
  ) row;

  return v_result;
end;
$function$;

-- 3) GMV/NMV (secao 7.1 -- "definicao provisoria"). Helper interno sem
-- checagem de papel: so e chamavel de dentro de get_finance_metrics, que
-- ja checou o papel antes (security definer roda como o owner da funcao,
-- que tem EXECUTE mesmo com o revoke abaixo -- mesmo padrao do
-- redeem_coupon).

create or replace function public._finance_waterfall(p_start timestamptz, p_end timestamptz)
returns jsonb
language sql
stable
set search_path to 'public'
as $function$
  select jsonb_build_object(
    'gmv_cents', coalesce((select sum(amount_cents + discount_cents) from payments where status = 'approved' and approved_at >= p_start and approved_at < p_end), 0),
    'coupon_discount_cents', coalesce((select sum(discount_cents) from payments where status = 'approved' and approved_at >= p_start and approved_at < p_end), 0),
    'refunds_cents', coalesce((select sum(amount_cents) from payments where status in ('refunded', 'partially_refunded') and updated_at >= p_start and updated_at < p_end), 0),
    'chargebacks_lost_cents', coalesce((select sum(amount_cents) from chargebacks where status = 'lost' and created_at >= p_start and created_at < p_end), 0),
    'fees_cents', coalesce((select sum(fee_cents) from payments where status = 'approved' and approved_at >= p_start and approved_at < p_end), 0)
  );
$function$;

revoke all on function public._finance_waterfall(timestamptz, timestamptz) from public, authenticated, anon;

create or replace function public.get_finance_metrics(p_month date default null)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_month_start timestamptz := date_trunc('month', coalesce(p_month, current_date));
  v_month_end timestamptz := v_month_start + interval '1 month';
  v_prev_start timestamptz := v_month_start - interval '1 month';
  v_current jsonb;
  v_previous jsonb;
  v_evolution json;
  v_by_plan json;
  v_by_method json;
  v_by_coupon json;
begin
  if not (public.has_staff_role('financeiro') or public.has_staff_role('owner')) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  v_current := public._finance_waterfall(v_month_start, v_month_end);
  v_current := v_current || jsonb_build_object(
    'nmv_cents', (v_current->>'gmv_cents')::bigint - (v_current->>'coupon_discount_cents')::bigint - (v_current->>'refunds_cents')::bigint - (v_current->>'chargebacks_lost_cents')::bigint
  );
  v_current := v_current || jsonb_build_object('net_cash_cents', (v_current->>'nmv_cents')::bigint - (v_current->>'fees_cents')::bigint);

  v_previous := public._finance_waterfall(v_prev_start, v_month_start);
  v_previous := v_previous || jsonb_build_object(
    'nmv_cents', (v_previous->>'gmv_cents')::bigint - (v_previous->>'coupon_discount_cents')::bigint - (v_previous->>'refunds_cents')::bigint - (v_previous->>'chargebacks_lost_cents')::bigint
  );
  v_previous := v_previous || jsonb_build_object('net_cash_cents', (v_previous->>'nmv_cents')::bigint - (v_previous->>'fees_cents')::bigint);

  select coalesce(json_agg(row order by row.month), '[]'::json) into v_evolution
  from (
    select
      to_char(m, 'YYYY-MM') as month,
      (x.w->>'gmv_cents')::bigint as gmv_cents,
      ((x.w->>'gmv_cents')::bigint - (x.w->>'coupon_discount_cents')::bigint - (x.w->>'refunds_cents')::bigint - (x.w->>'chargebacks_lost_cents')::bigint) as nmv_cents
    from generate_series(date_trunc('month', v_month_start) - interval '11 months', date_trunc('month', v_month_start), interval '1 month') m
    cross join lateral (select public._finance_waterfall(m, m + interval '1 month') as w) x
  ) row;

  select coalesce(json_agg(row order by row.revenue_cents desc), '[]'::json) into v_by_plan
  from (
    select bp.code as plan_code,
      sum(p.amount_cents) as revenue_cents,
      sum(p.discount_cents) as discount_cents
    from payments p
    join subscriptions s on s.id = p.subscription_id
    join billing_plans bp on bp.id = s.plan_id
    where p.status = 'approved' and p.approved_at >= v_month_start and p.approved_at < v_month_end
    group by bp.code
  ) row;

  select coalesce(json_agg(row order by row.revenue_cents desc), '[]'::json) into v_by_method
  from (
    select p.method,
      sum(p.amount_cents) as revenue_cents,
      sum(p.discount_cents) as discount_cents
    from payments p
    where p.status = 'approved' and p.approved_at >= v_month_start and p.approved_at < v_month_end
    group by p.method
  ) row;

  select coalesce(json_agg(row order by row.discount_cents desc), '[]'::json) into v_by_coupon
  from (
    select c.code as coupon_code,
      sum(p.discount_cents) as discount_cents,
      sum(p.amount_cents) as nmv_generated_cents
    from payments p
    join coupon_redemptions cr on cr.id = p.coupon_redemption_id
    join coupons c on c.id = cr.coupon_id
    where p.status = 'approved' and p.approved_at >= v_month_start and p.approved_at < v_month_end
    group by c.code
  ) row;

  return json_build_object(
    'month', to_char(v_month_start, 'YYYY-MM'),
    'current', v_current,
    'previous', v_previous,
    'evolution_12m', v_evolution,
    'by_plan', v_by_plan,
    'by_method', v_by_method,
    'by_coupon', v_by_coupon
  );
end;
$function$;
