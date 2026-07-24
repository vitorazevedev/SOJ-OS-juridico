-- Data de renovacao da assinatura Starter -- nao ha gateway de pagamento
-- integrado, entao essa data e controlada manualmente pela Equipe
-- Ponderum (confirma renovacao apos o cliente pagar de novo via WhatsApp).
-- Usada pra: (1) mostrar "faltam X dias" pro cliente em Configuracoes >
-- Plano, (2) disparar o aviso no topo do app quando faltar <=7 dias, (3)
-- aparecer na lista de organizacoes da Equipe Ponderum.

alter table public.organizations
  add column if not exists plan_renews_at timestamptz;

-- Upgrade (Freemium -> Starter pago) passa a definir os +30 dias de
-- renovacao automaticamente, mas so quando ainda nao ha uma data futura
-- definida (evita empurrar a renovacao toda vez que o status for tocado
-- por engano). Rebaixar para Freemium limpa a data.
create or replace function public.staff_set_org_plan_status(
  p_org_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.users
    where id = auth.uid() and is_ponderum_staff = true
  ) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  if p_status not in ('trial', 'active') then
    raise exception 'Status de plano inválido' using errcode = '22023';
  end if;

  update public.organizations
  set plan_status = p_status,
      plan_renews_at = case
        when p_status = 'active' and (plan_renews_at is null or plan_renews_at < now())
          then now() + interval '30 days'
        when p_status = 'trial' then null
        else plan_renews_at
      end
  where id = p_org_id;
end;
$$;

-- Renovacao manual: staff confirma que o cliente pagou o proximo ciclo.
create or replace function public.staff_renew_org_subscription(
  p_org_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.users
    where id = auth.uid() and is_ponderum_staff = true
  ) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  update public.organizations
  set plan_renews_at = now() + interval '30 days'
  where id = p_org_id and plan_status = 'active';
end;
$$;

-- Inclui plan_renews_at na listagem da Equipe Ponderum.
create or replace function public.list_staff_organizations(
  p_search text default null,
  p_page int default 1,
  p_page_size int default 10
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result json;
  v_offset int := greatest(p_page - 1, 0) * p_page_size;
  v_search text := nullif(trim(p_search), '');
begin
  if not exists (
    select 1 from public.users
    where id = auth.uid() and is_ponderum_staff = true
  ) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  with base as (
    select
      o.id, o.name, o.cnpj, o.plan_id, o.plan_status, o.blocked, o.created_at, o.plan_renews_at,
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
$$;
