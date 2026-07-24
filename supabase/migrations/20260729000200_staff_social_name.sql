-- "Nome social" opcional pro membro da Equipe Ponderum (preenche o
-- espaco vazio ao lado do CPF/CNPJ no formulario de cadastro).
alter table public.users
  add column if not exists social_name text;

create or replace function public.list_ponderum_staff()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result json;
begin
  if not exists (
    select 1 from public.users
    where id = auth.uid() and can_view_dev = true
  ) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  select coalesce(json_agg(row order by row.created_at desc), '[]'::json)
  into v_result
  from (
    select
      id, name, social_name, email, phone, staff_job_title,
      can_view_dev, can_view_ponderum_team, full_platform_access, created_at
    from users
    where is_ponderum_staff = true
  ) row;

  return v_result;
end;
$$;

create or replace function public.staff_update_member_permissions(
  p_user_id uuid,
  p_job_title text,
  p_can_view_dev boolean,
  p_can_view_ponderum_team boolean,
  p_full_platform_access boolean,
  p_social_name text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.users
    where id = auth.uid() and can_view_dev = true
  ) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  update public.users
  set staff_job_title = p_job_title,
      social_name = p_social_name,
      can_view_dev = p_can_view_dev,
      can_view_ponderum_team = p_can_view_ponderum_team,
      full_platform_access = p_full_platform_access
  where id = p_user_id and is_ponderum_staff = true;
end;
$$;
