-- Tabela de solicitações de acesso antecipado via landing page.
-- Inserção pública (visitantes não autenticados); leitura apenas via
-- get_admin_dashboard() com SECURITY DEFINER (role = admin).
create table public.waitlist (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  company    text,
  role       text,
  message    text,
  source     text default 'landing_page',
  created_at timestamptz default now(),
  constraint waitlist_email_unique unique (email)
);

alter table public.waitlist enable row level security;

-- Qualquer visitante pode inserir (landing page pública)
create policy "waitlist_public_insert" on public.waitlist
  for insert with check (true);
