-- Fase 2c do manager: get_admin_finance_summary() e list_admin_payments()
-- so checavam is_staff() (qualquer staff), nao has_staff_role('financeiro')
-- especificamente. Aperta pra bater com a area Financeiro de verdade ser
-- financeiro-only. Resto do corpo das funcoes fica identico.

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
  if not public.has_staff_role('financeiro') then
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

create or replace function public.list_admin_payments(p_limit integer DEFAULT 200)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_result json;
begin
  if not public.has_staff_role('financeiro') then
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
