-- Modulo de Cupom de Desconto (docs/CUPOM_SPEC.md), Etapa A -- schema.
-- Nomes de tabela/coluna seguem o spec ao pe da letra (ja escrito em cima
-- do schema real de billing_plans/subscriptions/payments).

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique, -- sempre gravado em maiusculas, ver validateCoupon()
  description text,
  discount_type text not null check (discount_type in ('percent','fixed')),
  discount_value integer not null check (discount_value > 0),
  -- 100%/cortesia (access_overrides) adiado -- ver nota de 2026-11-14 no
  -- topo do CUPOM_SPEC.md. Limite de 99 em vez de 100 enquanto isso.
  check (discount_type <> 'percent' or discount_value <= 99),
  duration text not null check (duration in ('once','repeating','forever')),
  duration_cycles integer check (duration_cycles > 0),
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  max_redemptions integer,
  max_per_organization integer not null default 1,
  allowed_plans text[] not null default '{}',
  allowed_methods text[] not null default '{card,pix}',
  new_customers_only boolean not null default false,
  is_active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  check (duration <> 'repeating' or duration_cycles is not null)
);
alter table public.coupons enable row level security;
-- Sem policy nenhuma -- so RPC security definer (financeiro/owner, Etapa C)
-- e Edge Functions (service role) tocam esta tabela, mesmo padrao de
-- billing_audit_log/webhook_events.

create table public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id),
  organization_id uuid not null references public.organizations(id),
  subscription_id uuid not null unique references public.subscriptions(id), -- 1 cupom por assinatura
  discount_snapshot jsonb not null,
  full_amount_cents integer not null,
  discounted_amount_cents integer not null,
  cycles_total integer, -- null = forever
  cycles_used integer not null default 0,
  status text not null default 'active' check (status in ('active','completed','canceled')),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.coupon_redemptions enable row level security;

-- Leitura do proprio cliente (tela "Minha assinatura" mostra o desconto),
-- mesmo padrao ja usado em payments_select/subscriptions_select.
create policy coupon_redemptions_select on public.coupon_redemptions
  for select using (organization_id = public.get_org_id());

alter table public.payments add column coupon_redemption_id uuid references public.coupon_redemptions(id);
alter table public.payments add column discount_cents integer not null default 0;

-- Rate limit de validacao de cupom (10 tentativas por usuario a cada 10min,
-- contra adivinhacao de codigo) -- log tecnico, sem policy de select, mesmo
-- padrao de billing_audit_log/webhook_events.
create table public.coupon_validation_attempts (
  id bigserial primary key,
  user_id uuid not null,
  created_at timestamptz not null default now()
);
alter table public.coupon_validation_attempts enable row level security;
create index coupon_validation_attempts_user_idx on public.coupon_validation_attempts (user_id, created_at desc);
