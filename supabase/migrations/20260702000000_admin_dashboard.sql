-- Eleva Vitor a admin
update public.users
set role = 'admin'
where email = 'vitor.azevedev@gmail.com';

-- Função centralizada para o painel do desenvolvedor.
-- SECURITY DEFINER + search_path fixo = sem elevation-of-privilege.
-- Verifica role = 'admin' antes de retornar qualquer dado.
create or replace function public.get_admin_dashboard()
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
    where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  select json_build_object(
    'stats', json_build_object(
      'total_orgs',           (select count(*)::int from organizations),
      'total_contracts',      (select count(*)::int from contracts),
      'contracts_this_month', (select count(*)::int from contracts
                               where created_at >= date_trunc('month', now())),
      'total_analyses',       (select count(*)::int from contract_analyses),
      'total_feedbacks',      (select count(*)::int from user_feedback)
    ),
    'feedbacks', (
      select coalesce(json_agg(row order by row.created_at desc), '[]'::json)
      from (
        select id, category, message, page_url, created_at
        from user_feedback
        order by created_at desc
        limit 50
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
    )
  ) into v_result;

  return v_result;
end;
$$;

-- Expõe a função apenas para usuários autenticados
-- (a verificação de admin acontece dentro da função)
revoke execute on function public.get_admin_dashboard() from public;
grant  execute on function public.get_admin_dashboard() to authenticated;
