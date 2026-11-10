-- Modulo de Pagamentos, Fase 1 -- payments e billing_customers (spec
-- secao 4). Ambas nascem vazias: nao ha dado de pagamento real do
-- Mercado Pago a migrar, e billing_receipts (recibo manual existente)
-- NAO e sintetizado em payments -- sao coisas diferentes (confirmacao
-- manual de humano vs. transacao de gateway); inventar linhas de
-- payments a partir do historico manual seria pior que nao ter historico.

create type public.payment_status as enum
  ('pending','approved','in_process','rejected','cancelled','expired','refunded','partially_refunded','charged_back','in_mediation');

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  subscription_id uuid references public.subscriptions(id),
  provider text not null,
  provider_payment_id text,
  idempotency_key text not null unique,
  method text not null check (method in ('card','pix')),
  status public.payment_status not null default 'pending',
  status_detail text,
  amount_cents integer not null,
  fee_cents integer,
  net_cents integer,
  money_release_date timestamptz,
  released boolean not null default false,
  period_start timestamptz,
  period_end timestamptz,
  pix_qr_code text,
  pix_qr_code_base64 text,
  pix_expires_at timestamptz,
  approved_at timestamptz,
  raw_last_response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_payment_id)
);

alter table public.payments enable row level security;

-- Organizacao le os proprios pagamentos, exceto raw_last_response (pode
-- conter detalhe tecnico do gateway nao destinado ao cliente final) --
-- expor via view sem essa coluna quando o frontend precisar consumir
-- isso (fase de checkout, nao agora).
create policy payments_select on public.payments
  for select using (organization_id = public.get_org_id());

comment on table public.payments is
  'Transacoes de pagamento via gateway (Modulo de Pagamentos, spec secao 4). Nao confundir com billing_receipts (ledger manual legado) -- payments e alimentada pelo webhook/MockProvider, nunca por confirmacao manual.';

-- -----------------------------------------------------------------------

create table public.billing_customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id),
  provider text not null,
  provider_customer_id text,
  legal_name text not null,
  document_type text not null check (document_type in ('CPF','CNPJ')),
  document_number text not null,
  email text not null,
  address jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_customer_id)
);

alter table public.billing_customers enable row level security;

create policy billing_customers_select on public.billing_customers
  for select using (organization_id = public.get_org_id());

comment on table public.billing_customers is
  'Dados de faturamento de uma organizacao no gateway (Modulo de Pagamentos, spec secao 4). Criada sob demanda no primeiro checkout real -- nao ha backfill retroativo, nenhuma organizacao passou por checkout ainda.';
