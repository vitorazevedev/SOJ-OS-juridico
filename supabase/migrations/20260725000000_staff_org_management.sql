-- Fase 2 do painel "Equipe Ponderum": lista de organizacoes com busca,
-- paginacao e acoes de upgrade/downgrade/bloqueio. Nao existe hoje um
-- plan_id distinto para "Freemium" -- toda organizacao nasce com
-- plan_id='starter', diferenciada apenas por plan_status ('trial' = nao
-- pago / 'active' = pago), entao "fazer upgrade"/"rebaixar" so alternam
-- esse status.

alter table public.organizations
  add column if not exists blocked boolean not null default false;

-- Lista paginada/pesquisavel de organizacoes para a equipe Ponderum, com o
-- contato do admin de cada uma (1 admin por organizacao, ver
-- admin-create-user). SECURITY DEFINER porque RLS de organizations so
-- libera a propria org do usuario.
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
      o.id, o.name, o.cnpj, o.plan_id, o.plan_status, o.blocked, o.created_at,
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

-- Upgrade ("Freemium" -> Starter pago) / downgrade (volta pra trial).
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

  update public.organizations set plan_status = p_status where id = p_org_id;
end;
$$;

-- Bloqueio: so impede novas analises de contrato (checado em
-- parse-contract), nao impede login nem visualizacao do que ja existe.
create or replace function public.staff_set_org_blocked(
  p_org_id uuid,
  p_blocked boolean
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

  update public.organizations set blocked = p_blocked where id = p_org_id;
end;
$$;
