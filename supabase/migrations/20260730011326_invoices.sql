-- Notas fiscais (Configuracoes > Plano > Notas fiscais). Diferente dos
-- recibos (billing_receipts, gerados automaticamente pelo sistema ao
-- confirmar upgrade/renovacao), a nota fiscal em si e emitida fora da
-- plataforma e anexada manualmente pela Equipe Ponderum pelo painel
-- "Equipe Ponderum" > Organizacoes > Upload NF.

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  numero_nota text not null,
  valor_cents int not null,
  data_emissao date not null,
  file_path text not null,
  uploaded_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists invoices_org_id_idx on public.invoices (org_id);

alter table public.invoices enable row level security;

drop policy if exists invoices_select on public.invoices;
create policy invoices_select on public.invoices
  for select using (org_id = public.get_org_id());

-- Insercao so via staff_create_invoice (security definer) -- sem policy de
-- insert direta, mesmo padrao de billing_receipts.

create or replace function public.staff_create_invoice(
  p_org_id uuid,
  p_numero_nota text,
  p_valor_cents int,
  p_data_emissao date,
  p_file_path text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not exists (
    select 1 from public.users
    where id = auth.uid() and is_ponderum_staff = true
  ) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  insert into public.invoices (org_id, numero_nota, valor_cents, data_emissao, file_path, uploaded_by)
  values (p_org_id, p_numero_nota, p_valor_cents, p_data_emissao, p_file_path, auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;

-- Storage: staff sobe o arquivo em notas-fiscais/{org_id}/{arquivo} antes de
-- chamar staff_create_invoice; org members leem o arquivo da propria
-- organizacao pela aba Notas Fiscais.

drop policy if exists "invoices_staff_insert" on storage.objects;
create policy "invoices_staff_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'contracts'
  and (storage.foldername(name))[1] = 'notas-fiscais'
  and exists (
    select 1 from public.users
    where id = auth.uid() and is_ponderum_staff = true
  )
);

drop policy if exists "invoices_select" on storage.objects;
create policy "invoices_select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'contracts'
  and (storage.foldername(name))[1] = 'notas-fiscais'
  and (
    (storage.foldername(name))[2] = public.get_org_id()::text
    or exists (
      select 1 from public.users
      where id = auth.uid() and is_ponderum_staff = true
    )
  )
);
