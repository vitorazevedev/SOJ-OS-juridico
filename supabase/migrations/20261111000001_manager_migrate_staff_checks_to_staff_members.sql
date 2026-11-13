-- Manager (manager.ponderum.com), Fase 1, Etapa A -- parte 2.
-- Troca a checagem de staff nas 17 funcoes + 4 policies que hoje leem
-- direto as colunas de `users` pra usar is_staff()/has_staff_role()
-- (criadas na migration anterior), lendo de `staff_members`. So a
-- clausula de checagem muda -- nenhuma outra logica e alterada.
--
-- As 8 funcoes que alteram estado (nao as 9 que so leem/listam) ganham
-- uma chamada a log_staff_action() nesta mesma migration, ja que o
-- staff_audit_log criado na migration anterior ainda nao tinha nenhum
-- escritor.
--
-- As 5 colunas antigas em `users` (is_ponderum_staff, can_view_dev,
-- can_view_ponderum_team, full_platform_access, staff_job_title) PARAM de
-- ser escritas/lidas a partir desta migration -- ficam congeladas ate a
-- Fase 5 (limpeza) remove-las. Nenhum codigo depois desta migration + do
-- ajuste em usePonderumPermissions.ts + dos 2 redeploys de Edge Function
-- (fora desta migration) ainda le essas colunas.

-- ---------------------------------------------------------------------
-- 1) Funcoes somente-leitura (is_staff / has_staff_role, sem audit log)
-- ---------------------------------------------------------------------

create or replace function public.get_admin_dashboard()
 returns json
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_result json;
begin
  if not public.is_staff() then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  select json_build_object(

    'stats', json_build_object(
      'total_orgs',              (select count(*)::int from organizations),
      'total_contracts',         (select count(*)::int from contracts),
      'contracts_this_month',    (select count(*)::int from contracts
                                  where created_at >= date_trunc('month', now())),
      'total_analyses',          (select count(*)::int from contract_analyses),
      'analyses_this_month',     (select count(*)::int from contract_analyses
                                  where created_at >= date_trunc('month', now())),
      'total_feedbacks',         (select count(*)::int from user_feedback),
      'total_waitlist',          (select count(*)::int from waitlist),
      'parse_tokens_input_month',    (select coalesce(sum(cc.tokens_input), 0)::bigint
                                       from contract_contents cc
                                       where cc.parsed_at >= date_trunc('month', now())),
      'parse_tokens_output_month',   (select coalesce(sum(cc.tokens_output), 0)::bigint
                                       from contract_contents cc
                                       where cc.parsed_at >= date_trunc('month', now())),
      'analysis_tokens_input_month',  (select coalesce(sum(ca.tokens_input), 0)::bigint
                                        from contract_analyses ca
                                        where ca.created_at >= date_trunc('month', now())),
      'analysis_tokens_output_month', (select coalesce(sum(ca.tokens_output), 0)::bigint
                                        from contract_analyses ca
                                        where ca.created_at >= date_trunc('month', now()))
    ),

    'feedbacks', (
      select coalesce(json_agg(row order by row.created_at desc), '[]'::json)
      from (
        select id, category, message, page_url, created_at
        from user_feedback
        order by created_at desc limit 50
      ) row
    ),

    'organizations', (
      select coalesce(json_agg(row order by row.created_at desc), '[]'::json)
      from (
        select
          o.id, o.name, o.plan_id, o.created_at,
          (select count(*)::int from contracts c where c.org_id = o.id) as contract_count,
          (select count(*)::int from contracts c
           join contract_analyses ca on ca.contract_id = c.id
           where c.org_id = o.id) as analysis_count
        from organizations o
        order by o.created_at desc
      ) row
    ),

    'analyses_per_day', (
      select coalesce(json_agg(row order by row.day), '[]'::json)
      from (
        select
          to_char(d.day, 'DD/MM') as day,
          coalesce(
            (select count(*)::int from contract_analyses ca
             where ca.created_at::date = d.day), 0
          ) as count
        from generate_series(
          current_date - interval '6 days', current_date, interval '1 day'
        ) as d(day)
      ) row
    ),

    'recent_contracts', (
      select coalesce(json_agg(row order by row.created_at desc), '[]'::json)
      from (
        select c.id, c.name, c.status, c.created_at, o.name as org_name
        from contracts c
        join organizations o on o.id = c.org_id
        order by c.created_at desc limit 10
      ) row
    ),

    'cron_health', (
      select coalesce(json_agg(row order by row.jobname), '[]'::json)
      from (
        select distinct on (j.jobname)
          j.jobname, j.schedule, r.status, r.start_time, r.return_message
        from cron.job j
        left join cron.job_run_details r on r.jobid = j.jobid
        order by j.jobname, r.start_time desc nulls last
      ) row
    ),

    'waitlist', (
      select coalesce(json_agg(row order by row.created_at desc), '[]'::json)
      from (
        select id, name, email, phone, company, role, message, source,
               contracts_per_month, consent, utm_medium, utm_campaign, utm_content,
               created_at
        from waitlist
        order by created_at desc limit 100
      ) row
    )

  ) into v_result;

  return v_result;
end;
$function$;

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
  if not public.is_staff() then
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

create or replace function public.get_executive_dashboard()
 returns json
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_result json;
  v_starter_price constant int := 490;
  v_starter_count int;
  v_freemium_count int;
  v_blocked_count int;
  v_churned_30d int;
begin
  if not public.has_staff_role('equipe') then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  select count(*) filter (where o.plan_status = 'active'),
         count(*) filter (where o.plan_status = 'trial'),
         count(*) filter (where o.blocked)
    into v_starter_count, v_freemium_count, v_blocked_count
    from organizations o
    where not exists (
      select 1 from public.users u
      where u.org_id = o.id and public.is_staff(u.id)
    );

  select count(distinct h.org_id) into v_churned_30d
  from organizations_status_history h
  where h.previous_plan_status = 'active'
    and h.plan_status = 'trial'
    and h.changed_at >= now() - interval '30 days'
    and not exists (
      select 1 from public.users u
      where u.org_id = h.org_id and public.is_staff(u.id)
    );

  select json_build_object(

    'stats', json_build_object(
      'total_orgs',       v_starter_count + v_freemium_count,
      'starter_count',    v_starter_count,
      'freemium_count',   v_freemium_count,
      'blocked_count',    v_blocked_count,
      'mrr_estimate',     v_starter_count * v_starter_price,
      'churned_30d',      v_churned_30d,
      'churn_rate_30d',   round(
                             v_churned_30d::numeric
                             / greatest(v_starter_count + v_churned_30d, 1) * 100
                           , 1),
      'revenue_30d', (
        select coalesce(round(sum(br.amount_cents) / 100.0), 0)::int
        from billing_receipts br
        join organizations o on o.id = br.org_id
        where br.issued_at >= now() - interval '30 days'
          and not exists (
            select 1 from public.users u
            where u.org_id = o.id and public.is_staff(u.id)
          )
      ),
      'parse_tokens_input_30d', (
        select coalesce(sum(cc.tokens_input), 0)::bigint
        from contract_contents cc
        join contracts c on c.id = cc.contract_id
        where cc.parsed_at >= now() - interval '30 days'
          and not exists (
            select 1 from public.users u
            where u.org_id = c.org_id and public.is_staff(u.id)
          )
      ),
      'parse_tokens_output_30d', (
        select coalesce(sum(cc.tokens_output), 0)::bigint
        from contract_contents cc
        join contracts c on c.id = cc.contract_id
        where cc.parsed_at >= now() - interval '30 days'
          and not exists (
            select 1 from public.users u
            where u.org_id = c.org_id and public.is_staff(u.id)
          )
      ),
      'analysis_tokens_input_30d', (
        select coalesce(sum(ca.tokens_input), 0)::bigint
        from contract_analyses ca
        join contracts c on c.id = ca.contract_id
        where ca.created_at >= now() - interval '30 days'
          and not exists (
            select 1 from public.users u
            where u.org_id = c.org_id and public.is_staff(u.id)
          )
      ),
      'analysis_tokens_output_30d', (
        select coalesce(sum(ca.tokens_output), 0)::bigint
        from contract_analyses ca
        join contracts c on c.id = ca.contract_id
        where ca.created_at >= now() - interval '30 days'
          and not exists (
            select 1 from public.users u
            where u.org_id = c.org_id and public.is_staff(u.id)
          )
      )
    ),

    'growth_monthly', (
      select coalesce(json_agg(row order by row.month_start), '[]'::json)
      from (
        select
          m.month_start,
          to_char(m.month_start, 'Mon/YY') as month,
          coalesce(
            (select count(*)::int from organizations o
             where date_trunc('month', o.created_at) = m.month_start
               and not exists (
                 select 1 from public.users u
                 where u.org_id = o.id and public.is_staff(u.id)
               )
            ), 0
          ) as new_orgs
        from (
          select date_trunc('month', current_date - (n || ' months')::interval) as month_start
          from generate_series(0, 5) as n
        ) m
      ) row
    ),

    'revenue_monthly', (
      select coalesce(json_agg(row order by row.month_start), '[]'::json)
      from (
        select
          m.month_start,
          to_char(m.month_start, 'Mon/YY') as month,
          coalesce(
            (select round(sum(br.amount_cents) / 100.0)::int
             from billing_receipts br
             join organizations o on o.id = br.org_id
             where date_trunc('month', br.issued_at) = m.month_start
               and not exists (
                 select 1 from public.users u
                 where u.org_id = o.id and public.is_staff(u.id)
               )
            ), 0
          ) as revenue
        from (
          select date_trunc('month', current_date - (n || ' months')::interval) as month_start
          from generate_series(0, 5) as n
        ) m
      ) row
    )

  ) into v_result;

  return v_result;
end;
$function$;

create or replace function public.get_support_stats()
 returns json
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_result json;
begin
  if not public.has_staff_role('dev') then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  select json_build_object(
    'total_clicks',      (select count(*)::int from support_clicks),
    'clicks_this_month', (select count(*)::int from support_clicks
                           where clicked_at >= date_trunc('month', now()))
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
  if not public.is_staff() then
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

create or replace function public.list_open_chargebacks()
 returns json
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_result json;
begin
  if not public.is_staff() then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  select coalesce(json_agg(row order by row.created_at desc), '[]'::json)
  into v_result
  from (
    select cb.id, cb.organization_id, o.name as organization_name, cb.amount_cents,
           cb.status, cb.reason, cb.documentation_due_at, cb.created_at
    from chargebacks cb
    join organizations o on o.id = cb.organization_id
    where cb.status = 'opened'
  ) row;

  return v_result;
end;
$function$;

create or replace function public.list_ponderum_staff()
 returns json
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_result json;
begin
  if not public.has_staff_role('dev') then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  select coalesce(json_agg(row order by row.created_at desc), '[]'::json)
  into v_result
  from (
    select
      u.id, u.name, u.social_name, u.email, u.phone, sm.job_title as staff_job_title,
      ('dev' = any(sm.roles)) as can_view_dev,
      ('equipe' = any(sm.roles)) as can_view_ponderum_team,
      sm.full_platform_access, u.created_at
    from public.users u
    join public.staff_members sm on sm.id = u.id
  ) row;

  return v_result;
end;
$function$;

create or replace function public.list_staff_contracts(p_search text DEFAULT NULL::text, p_page integer DEFAULT 1, p_page_size integer DEFAULT 10)
 returns json
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_result json;
  v_offset int := greatest(p_page - 1, 0) * p_page_size;
  v_search text := nullif(trim(p_search), '');
begin
  if not public.has_staff_role('equipe') then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  with base as (
    select
      c.id, c.name, c.status, c.created_at,
      o.id as org_id, o.name as org_name,
      ca.id as analysis_id, coalesce(ca.courtesy_unlock, false) as courtesy_unlock,
      u.name as contact_name, u.email as contact_email
    from public.contracts c
    join public.organizations o on o.id = c.org_id
    left join public.contract_analyses ca on ca.contract_id = c.id
    left join lateral (
      select name, email
      from public.users
      where org_id = o.id and role = 'admin'
      order by created_at asc
      limit 1
    ) u on true
    where
      v_search is null
      or c.name ilike '%' || v_search || '%'
      or o.name ilike '%' || v_search || '%'
      or u.name ilike '%' || v_search || '%'
      or u.email ilike '%' || v_search || '%'
  )
  select json_build_object(
    'total', (select count(*)::int from base),
    'rows', coalesce((
      select json_agg(row order by row.created_at desc)
      from (
        select * from base
        order by created_at desc
        limit p_page_size offset v_offset
      ) row
    ), '[]'::json)
  ) into v_result;

  return v_result;
end;
$function$;

create or replace function public.list_staff_organizations(p_search text DEFAULT NULL::text, p_page integer DEFAULT 1, p_page_size integer DEFAULT 10)
 returns json
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_result json;
  v_offset int := greatest(p_page - 1, 0) * p_page_size;
  v_search text := nullif(trim(p_search), '');
begin
  if not public.has_staff_role('equipe') then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  with base as (
    select
      o.id, o.name, o.cnpj, o.plan_id, o.plan_status, o.blocked, o.risk_flagged, o.created_at, o.plan_renews_at,
      u.name as admin_name, u.email as admin_email, u.phone as admin_phone
    from organizations o
    left join lateral (
      select name, email, phone
      from users
      where org_id = o.id and role = 'admin'
      order by created_at asc
      limit 1
    ) u on true
    where
      v_search is null
      or o.name ilike '%' || v_search || '%'
      or o.cnpj ilike '%' || v_search || '%'
      or u.name ilike '%' || v_search || '%'
      or u.email ilike '%' || v_search || '%'
      or u.phone ilike '%' || v_search || '%'
  )
  select json_build_object(
    'total', (select count(*)::int from base),
    'rows', coalesce((
      select json_agg(row order by row.created_at desc)
      from (
        select * from base
        order by created_at desc
        limit p_page_size offset v_offset
      ) row
    ), '[]'::json)
  ) into v_result;

  return v_result;
end;
$function$;

-- ---------------------------------------------------------------------
-- 2) Funcoes que alteram estado (is_staff / has_staff_role + log_staff_action)
-- ---------------------------------------------------------------------

create or replace function public.staff_create_invoice(p_org_id uuid, p_numero_nota text, p_valor_cents integer, p_data_emissao date, p_file_path text)
 returns uuid
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_id uuid;
begin
  if not public.is_staff() then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  insert into public.invoices (org_id, numero_nota, valor_cents, data_emissao, file_path, uploaded_by)
  values (p_org_id, p_numero_nota, p_valor_cents, p_data_emissao, p_file_path, auth.uid())
  returning id into v_id;

  perform public.log_staff_action('create_invoice', 'organization', p_org_id::text,
    jsonb_build_object('invoice_id', v_id, 'numero_nota', p_numero_nota, 'valor_cents', p_valor_cents));

  return v_id;
end;
$function$;

create or replace function public.staff_renew_org_subscription(p_org_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if not public.has_staff_role('equipe') then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  update public.organizations
  set plan_renews_at = now() + interval '30 days'
  where id = p_org_id and plan_status = 'active';

  insert into public.billing_receipts (org_id, amount_cents, description)
  select p_org_id, 49000, 'Renovação mensal — Plano Starter'
  where exists (select 1 from organizations where id = p_org_id and plan_status = 'active');

  perform public.log_staff_action('renew_org_subscription', 'organization', p_org_id::text, '{}'::jsonb);
end;
$function$;

create or replace function public.staff_set_courtesy_unlock(p_analysis_id uuid, p_unlock boolean)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if not public.has_staff_role('equipe') then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  update public.contract_analyses set courtesy_unlock = p_unlock where id = p_analysis_id;

  perform public.log_staff_action('set_courtesy_unlock', 'contract_analysis', p_analysis_id::text,
    jsonb_build_object('unlock', p_unlock));
end;
$function$;

create or replace function public.staff_set_org_blocked(p_org_id uuid, p_blocked boolean)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if not public.has_staff_role('equipe') then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  update public.organizations set blocked = p_blocked where id = p_org_id;

  perform public.log_staff_action('set_org_blocked', 'organization', p_org_id::text,
    jsonb_build_object('blocked', p_blocked));
end;
$function$;

create or replace function public.staff_set_org_plan_status(p_org_id uuid, p_status text, p_plan_id text DEFAULT NULL::text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_was_active boolean;
  v_plan_id text;
  v_amount_cents int;
  v_plan_label text;
begin
  if not public.is_staff() then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  if p_status not in ('trial', 'active') then
    raise exception 'Status de plano inválido' using errcode = '22023';
  end if;

  if p_plan_id is not null and p_plan_id not in ('starter', 'individual', 'escritorio', 'juridico', 'corporativo') then
    raise exception 'plan_id inválido' using errcode = '22023';
  end if;

  select (plan_status = 'active') into v_was_active from organizations where id = p_org_id;

  -- tier efetivo pro calculo do recibo: o informado agora, senao o que a
  -- organizacao ja tinha, senao starter (mesmo default de hoje).
  v_plan_id := coalesce(p_plan_id, (select plan_id from organizations where id = p_org_id), 'starter');

  update public.organizations
  set plan_status = p_status,
      plan_id = case when p_plan_id is not null then p_plan_id else plan_id end,
      plan_renews_at = case
        when p_status = 'active' and (plan_renews_at is null or plan_renews_at < now())
          then now() + interval '30 days'
        when p_status = 'trial' then null
        else plan_renews_at
      end
  where id = p_org_id;

  -- Recibo do primeiro pagamento -- so quando a organizacao nao estava
  -- ativa antes (evita duplicar recibo se o status for tocado de novo
  -- sem sair de active). Valor/descricao agora dependem do tier.
  if p_status = 'active' and not coalesce(v_was_active, false) then
    v_amount_cents := case v_plan_id
      when 'individual' then 19900
      when 'escritorio' then 49900
      when 'juridico' then 89900
      when 'corporativo' then 174900
      else 49000 -- starter (legado)
    end;
    v_plan_label := case v_plan_id
      when 'individual' then 'Individual'
      when 'escritorio' then 'Escritório'
      when 'juridico' then 'Jurídico'
      when 'corporativo' then 'Corporativo'
      else 'Starter'
    end;
    insert into public.billing_receipts (org_id, amount_cents, description)
    values (p_org_id, v_amount_cents, 'Primeiro pagamento — Plano ' || v_plan_label);
  end if;

  perform public.log_staff_action('set_org_plan_status', 'organization', p_org_id::text,
    jsonb_build_object('status', p_status, 'plan_id', p_plan_id));
end;
$function$;

create or replace function public.staff_set_org_risk_flag(p_org_id uuid, p_risk_flagged boolean)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if not public.is_staff() then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  update public.organizations set risk_flagged = p_risk_flagged where id = p_org_id;

  perform public.log_staff_action('set_org_risk_flag', 'organization', p_org_id::text,
    jsonb_build_object('risk_flagged', p_risk_flagged));
end;
$function$;

create or replace function public.staff_set_support_whatsapp(p_number text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if not public.has_staff_role('dev') then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  insert into public.app_settings (key, value, updated_at)
  values ('support_whatsapp', p_number, now())
  on conflict (key) do update set value = excluded.value, updated_at = now();

  perform public.log_staff_action('set_support_whatsapp', 'app_settings', 'support_whatsapp', '{}'::jsonb);
end;
$function$;

create or replace function public.staff_update_member_permissions(p_user_id uuid, p_job_title text, p_can_view_dev boolean, p_can_view_ponderum_team boolean, p_full_platform_access boolean)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if not public.has_staff_role('dev') then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  update public.staff_members
  set job_title = p_job_title,
      roles = array_remove(array[
        case when p_can_view_dev then 'dev'::public.staff_role end,
        case when p_can_view_ponderum_team then 'equipe'::public.staff_role end
      ], null),
      full_platform_access = p_full_platform_access,
      updated_at = now()
  where id = p_user_id;

  perform public.log_staff_action('update_member_permissions', 'user', p_user_id::text,
    jsonb_build_object('can_view_dev', p_can_view_dev, 'can_view_ponderum_team', p_can_view_ponderum_team, 'full_platform_access', p_full_platform_access));
end;
$function$;

create or replace function public.staff_update_member_permissions(p_user_id uuid, p_job_title text, p_can_view_dev boolean, p_can_view_ponderum_team boolean, p_full_platform_access boolean, p_social_name text DEFAULT NULL::text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if not public.has_staff_role('dev') then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  update public.staff_members
  set job_title = p_job_title,
      roles = array_remove(array[
        case when p_can_view_dev then 'dev'::public.staff_role end,
        case when p_can_view_ponderum_team then 'equipe'::public.staff_role end
      ], null),
      full_platform_access = p_full_platform_access,
      updated_at = now()
  where id = p_user_id;

  update public.users
  set social_name = p_social_name
  where id = p_user_id;

  perform public.log_staff_action('update_member_permissions', 'user', p_user_id::text,
    jsonb_build_object('can_view_dev', p_can_view_dev, 'can_view_ponderum_team', p_can_view_ponderum_team, 'full_platform_access', p_full_platform_access, 'social_name', p_social_name));
end;
$function$;

-- ---------------------------------------------------------------------
-- 3) RLS policies
-- ---------------------------------------------------------------------

alter policy analysis_shadow_context_select on public.analysis_shadow_context
  using (
    exists (
      select 1 from contract_analyses ca join contracts c on c.id = ca.contract_id
      where ca.id = analysis_shadow_context.analysis_id and c.org_id = get_org_id()
    )
    or public.is_staff()
  );

alter policy clause_gating_shadow_select on public.clause_gating_shadow
  using (
    exists (
      select 1 from contract_analyses ca join contracts c on c.id = ca.contract_id
      where ca.id = clause_gating_shadow.analysis_id and c.org_id = get_org_id()
    )
    or public.is_staff()
  );

alter policy "invoices_select" on storage.objects
  using (
    bucket_id = 'contracts'
    and (storage.foldername(name))[1] = 'notas-fiscais'
    and ((storage.foldername(name))[2] = (get_org_id())::text or public.is_staff())
  );

alter policy "invoices_staff_insert" on storage.objects
  with check (
    bucket_id = 'contracts'
    and (storage.foldername(name))[1] = 'notas-fiscais'
    and public.is_staff()
  );
