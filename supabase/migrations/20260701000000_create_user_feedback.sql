create table public.user_feedback (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid references public.organizations(id) on delete cascade,
  user_id    uuid references public.users(id) on delete set null,
  category   text not null check (category in ('utilidade', 'erro', 'omissao')),
  message    text not null,
  page_url   text,
  created_at timestamptz default now()
);

alter table public.user_feedback enable row level security;

-- Usuários só podem inserir feedback da própria organização; leitura é
-- exclusiva do painel do desenvolvedor via service_role.
create policy "feedback_insert_own_org" on public.user_feedback
  for insert with check (org_id = get_org_id());
