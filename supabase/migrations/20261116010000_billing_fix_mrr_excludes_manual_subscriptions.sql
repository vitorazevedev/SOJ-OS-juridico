-- get_admin_finance_summary() contava QUALQUER assinatura 'active' no MRR,
-- inclusive as de provider='manual' (contas internas de staff com acesso
-- completo, nunca foi cobranca de verdade -- Fellipe/Kober/Vitor). Bug
-- encontrado ao notar R$980,00 de MRR com zero pagamentos reais em
-- producao. Resto do corpo da funcao identico.

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
      select sum(bp.price_cents) from subscriptions s join billing_plans bp on bp.id = s.plan_id
      where s.status = 'active' and s.provider <> 'manual'
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
