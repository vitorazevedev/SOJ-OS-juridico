-- Manager (manager.ponderum.com), Fase 1, Etapa A -- fundacao de dados.
-- Substitui as 5 colunas booleanas soltas em `users` (is_ponderum_staff,
-- can_view_dev, can_view_ponderum_team, full_platform_access, staff_job_title)
-- por uma tabela staff_members real + enum staff_role, conforme decisao
-- registrada em docs/manager-decisions.md (2026-11-11).
--
-- As 5 colunas antigas em `users` NAO sao removidas nesta migration --
-- continuam existindo ate a Fase 5 (limpeza), so param de ser a fonte de
-- verdade a partir da proxima migration (que troca as 17 funcoes/4 policies
-- que hoje leem essas colunas pra usar is_staff()/has_staff_role()).

create type public.staff_role as enum ('owner', 'dev', 'equipe', 'financeiro');

create table public.staff_members (
  id uuid primary key references public.users(id) on delete cascade,
  roles public.staff_role[] not null default '{}',
  full_platform_access boolean not null default false,
  job_title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.staff_members enable row level security;

-- Cada staff member le o proprio registro (pra usePonderumPermissions.ts
-- saber os proprios papeis). Sem policy de insert/update/delete pra
-- authenticated/anon -- escrita so via service_role (Edge Functions),
-- mesmo padrao ja usado em billing_audit_log/webhook_events.
create policy staff_members_self_select on public.staff_members
  for select using (id = auth.uid());

create table public.staff_audit_log (
  id bigserial primary key,
  staff_id uuid not null references public.users(id),
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.staff_audit_log enable row level security;
-- Log tecnico, sem policy de select -- so service_role, mesmo padrao de
-- billing_audit_log/webhook_events.

create index staff_audit_log_staff_id_idx on public.staff_audit_log (staff_id, created_at desc);

create or replace function public.is_staff(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.staff_members where id = p_user_id);
$$;

create or replace function public.has_staff_role(p_role public.staff_role, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.staff_members
    where id = p_user_id and p_role = any(roles)
  );
$$;

create or replace function public.log_staff_action(
  p_action text,
  p_target_type text default null,
  p_target_id text default null,
  p_metadata jsonb default '{}'
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.staff_audit_log (staff_id, action, target_type, target_id, metadata)
  values (auth.uid(), p_action, p_target_type, p_target_id, p_metadata);
$$;

-- Backfill 1:1 a partir das colunas atuais, sem mudar nenhum comportamento:
-- can_view_dev -> 'dev', can_view_ponderum_team -> 'equipe'. 'financeiro' e
-- 'owner' ficam sem ninguem ainda (papeis novos, usados a partir da Fase 3
-- e de uma decisao manual do Vitor, respectivamente).
insert into public.staff_members (id, roles, full_platform_access, job_title)
select
  id,
  array_remove(array[
    case when can_view_dev then 'dev'::public.staff_role end,
    case when can_view_ponderum_team then 'equipe'::public.staff_role end
  ], null),
  full_platform_access,
  staff_job_title
from public.users
where is_ponderum_staff = true;
