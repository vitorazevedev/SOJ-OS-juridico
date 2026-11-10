-- Modulo de Pagamentos, Fase 2 -- webhook_events (spec secao 4, Peca 2+3).
-- Todo webhook e gravado aqui ANTES de ser processado (unique por
-- provider+provider_event_id garante que reenvio nao processa 2x).
-- RLS ligado, sem policy de select -- log tecnico, so service_role (mesmo
-- padrao de billing_audit_log).

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text,
  resource_type text not null,
  resource_id text not null,
  action text,
  signature_valid boolean not null,
  payload jsonb not null,
  status text not null default 'received' check (status in ('received','processing','processed','ignored','failed')),
  attempts integer not null default 0,
  last_error text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create index webhook_events_pending_idx on public.webhook_events(status) where status in ('received','failed');

alter table public.webhook_events enable row level security;
