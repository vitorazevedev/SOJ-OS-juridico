-- Da funcao real ao card "Canal de suporte" do painel Dev: numero de
-- WhatsApp editavel sem precisar de deploy, e um contador de cliques no
-- botao flutuante "Suporte" pra ter visibilidade de volume.

create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (key, value)
values ('support_whatsapp', '5511964889002')
on conflict (key) do nothing;

alter table public.app_settings enable row level security;

drop policy if exists app_settings_select on public.app_settings;
create policy app_settings_select on public.app_settings
  for select using (auth.uid() is not null);

create table if not exists public.support_clicks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  org_id uuid references public.organizations(id) on delete set null,
  clicked_at timestamptz not null default now()
);

alter table public.support_clicks enable row level security;

-- Qualquer usuario logado pode registrar seu proprio clique; sem select
-- policy pra usuario comum (default-deny) -- so a equipe le, via RPC
-- SECURITY DEFINER abaixo.
drop policy if exists support_clicks_insert on public.support_clicks;
create policy support_clicks_insert on public.support_clicks
  for insert with check (auth.uid() is not null);

create or replace function public.staff_set_support_whatsapp(
  p_number text
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

  insert into public.app_settings (key, value, updated_at)
  values ('support_whatsapp', p_number, now())
  on conflict (key) do update set value = excluded.value, updated_at = now();
end;
$$;

create or replace function public.get_support_stats()
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

  select json_build_object(
    'total_clicks',      (select count(*)::int from support_clicks),
    'clicks_this_month', (select count(*)::int from support_clicks
                           where clicked_at >= date_trunc('month', now()))
  ) into v_result;

  return v_result;
end;
$$;
