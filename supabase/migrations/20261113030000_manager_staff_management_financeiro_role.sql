-- Tela "Gestao da Equipe Ponderum" (PonderumStaffManagement) so tinha
-- toggle pra 'dev'/'equipe' -- o papel 'financeiro' so podia ser concedido
-- direto no banco. Estende list_ponderum_staff() e
-- staff_update_member_permissions() pra incluir o papel financeiro,
-- mesmo padrao ja usado pros outros dois.

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
      ('financeiro' = any(sm.roles)) as can_view_financeiro,
      sm.full_platform_access, u.created_at
    from public.users u
    join public.staff_members sm on sm.id = u.id
  ) row;

  return v_result;
end;
$function$;

create or replace function public.staff_update_member_permissions(
  p_user_id uuid,
  p_job_title text,
  p_can_view_dev boolean,
  p_can_view_ponderum_team boolean,
  p_full_platform_access boolean,
  p_social_name text default null,
  p_can_view_financeiro boolean default false
)
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
        case when p_can_view_ponderum_team then 'equipe'::public.staff_role end,
        case when p_can_view_financeiro then 'financeiro'::public.staff_role end
      ], null),
      full_platform_access = p_full_platform_access,
      updated_at = now()
  where id = p_user_id;

  update public.users
  set social_name = p_social_name
  where id = p_user_id;

  perform public.log_staff_action('update_member_permissions', 'user', p_user_id::text,
    jsonb_build_object(
      'can_view_dev', p_can_view_dev,
      'can_view_ponderum_team', p_can_view_ponderum_team,
      'can_view_financeiro', p_can_view_financeiro,
      'full_platform_access', p_full_platform_access,
      'social_name', p_social_name
    ));
end;
$function$;
