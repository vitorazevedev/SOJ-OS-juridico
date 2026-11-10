-- Modulo de Pagamentos, Fase 5c -- fila de nota fiscal automatica (spec
-- Peca 10). organization_id aqui nao esta na spec literal (secao 4), mas
-- segue o mesmo padrao de chargebacks (Fase 5a) -- RLS simples.

create table public.fiscal_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  payment_id uuid not null unique references public.payments(id),
  provider text not null,
  provider_invoice_id text,
  status text not null default 'queued' check (status in ('queued','processing','issued','error','canceled')),
  number text,
  verification_code text,
  pdf_url text,
  xml_url text,
  attempts integer not null default 0,
  last_error text,
  issued_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.fiscal_invoices enable row level security;

create policy fiscal_invoices_select on public.fiscal_invoices
  for select using (organization_id = public.get_org_id());

create index fiscal_invoices_pending_idx on public.fiscal_invoices(status) where status in ('queued','error');
