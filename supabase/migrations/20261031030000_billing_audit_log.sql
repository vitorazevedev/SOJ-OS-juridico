-- Modulo de Pagamentos, Fase 1 -- billing_audit_log (spec secao 4,
-- Principio 7: "toda mudanca de estado gera um registro de auditoria").
-- Pre-requisito de supabase/functions/_shared/billing/domain/subscriptions.ts
-- (transitionSubscription grava aqui a cada transicao).

create table public.billing_audit_log (
  id bigserial primary key,
  organization_id uuid,
  entity text not null,
  entity_id uuid,
  from_status text,
  to_status text,
  actor text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index billing_audit_log_org_idx on public.billing_audit_log (organization_id, created_at desc);
create index billing_audit_log_entity_idx on public.billing_audit_log (entity, entity_id);

alter table public.billing_audit_log enable row level security;

-- Sem policy de select para authenticated -- e um log tecnico, nao um
-- dado de produto a expor ao cliente final. So service_role/admin acessa
-- (igual ao padrao ja usado em webhook_events-style tables do projeto).

comment on table public.billing_audit_log is
  'Trilha de auditoria de toda mudanca de estado de assinatura/pagamento (Modulo de Pagamentos, spec secao 4, Principio 7). Escrita exclusiva de supabase/functions/_shared/billing/domain/*.ts.';
