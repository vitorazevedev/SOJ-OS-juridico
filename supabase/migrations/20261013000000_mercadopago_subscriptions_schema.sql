-- Story 1.1 (Epic: Checkout Digital de Assinatura, Mercado Pago) — schema base
-- para as proximas stories (criacao de assinatura, webhook, reconciliacao).
-- Nao cria nenhuma Edge Function nem logica de pagamento ainda -- so o
-- schema e a extensao do suporte manual ja existente, pra nao perder a
-- capacidade de ativar/corrigir um plano manualmente durante a transicao.
-- Ver docs/prd-mercadopago-checkout.md e docs/stories/1.1.schema-assinatura-mercadopago.story.md.

-- -----------------------------------------------------------------------
-- Task 1 (AC1): vinculo organizacao <-> assinatura do Mercado Pago.
-- unique(org_id) ja aplica no nivel de schema a regra "no maximo uma
-- assinatura por organizacao" (FR13 do PRD) -- a Story 1.2 cuida do lock
-- atomico na CRIACAO, isso aqui so impede duas linhas coexistindo.
-- -----------------------------------------------------------------------
create table if not exists public.organization_mercadopago_subscriptions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null unique references public.organizations(id) on delete cascade,
  mp_subscription_id text not null unique,
  mp_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists org_mp_subscriptions_mp_subscription_id_idx
  on public.organization_mercadopago_subscriptions (mp_subscription_id);

alter table public.organization_mercadopago_subscriptions enable row level security;

drop policy if exists org_mp_subscriptions_select on public.organization_mercadopago_subscriptions;
create policy org_mp_subscriptions_select on public.organization_mercadopago_subscriptions
  for select using (org_id = public.get_org_id());

comment on table public.organization_mercadopago_subscriptions is
  'Vincula uma organizacao a sua assinatura no Mercado Pago. Escrita feita só pelas Edge Functions (service_role) nas próximas stories deste épico.';

-- -----------------------------------------------------------------------
-- Task 2 (AC2): eventos de webhook ja processados -- base da idempotencia
-- exigida em FR4/NFR10 do PRD. So a Edge Function de webhook (service_role,
-- Story 1.3) toca essa tabela; nenhum usuario autenticado precisa ler aqui
-- diretamente, por isso RLS habilitada sem nenhuma policy de select para
-- 'authenticated' (nega por padrao).
-- -----------------------------------------------------------------------
create table if not exists public.mercadopago_webhook_events (
  id uuid primary key default gen_random_uuid(),
  mp_event_id text not null unique,
  event_type text not null,
  mp_subscription_id text,
  processed_at timestamptz not null default now(),
  payload jsonb
);

create index if not exists mp_webhook_events_subscription_idx
  on public.mercadopago_webhook_events (mp_subscription_id);

alter table public.mercadopago_webhook_events enable row level security;

comment on table public.mercadopago_webhook_events is
  'Ledger de eventos de webhook do Mercado Pago ja processados -- base da idempotencia (FR4) e da protecao contra replay fora de ordem (NFR10). Sem policy de select: só service_role acessa.';

-- -----------------------------------------------------------------------
-- Task 3 (AC3): organizations.plan_id precisa aceitar os novos tiers.
-- Bloco defensivo: remove qualquer CHECK constraint existente em plan_id
-- (sem precisar saber o nome dela de antemao -- consulta ao banco de
-- producao nao foi possivel nesta sessao por falha de autenticacao da
-- CLI, ver Completion Notes da story) e recria com os valores validos.
-- -----------------------------------------------------------------------
do $$
declare
  v_conname text;
begin
  select conname into v_conname
  from pg_constraint
  where conrelid = 'public.organizations'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%plan_id%';

  if v_conname is not null then
    execute format('alter table public.organizations drop constraint %I', v_conname);
  end if;
end $$;

alter table public.organizations
  add constraint organizations_plan_id_check
  check (plan_id in ('starter', 'individual', 'escritorio', 'juridico', 'corporativo'));

comment on column public.organizations.plan_id is
  'Tier do plano pago. starter = legado (pre-Mercado Pago, ainda valido para orgs existentes). Novos: individual, escritorio, juridico, corporativo. plan_status (trial/active) continua controlando se o tier esta de fato ativo.';

-- -----------------------------------------------------------------------
-- Task 4 (AC4): staff_set_org_plan_status estendida para aceitar tier,
-- preservando 100% de compatibilidade com chamadas existentes (sem o novo
-- parametro) -- IV3 da story. O valor do recibo gerado em billing_receipts
-- agora reflete o tier de verdade (antes estava fixo em R$490/Starter,
-- o que ficaria errado ao ativar qualquer um dos tiers novos).
-- -----------------------------------------------------------------------
create or replace function public.staff_set_org_plan_status(
  p_org_id uuid,
  p_status text,
  p_plan_id text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_was_active boolean;
  v_plan_id text;
  v_amount_cents int;
  v_plan_label text;
begin
  if not exists (
    select 1 from public.users
    where id = auth.uid() and is_ponderum_staff = true
  ) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  if p_status not in ('trial', 'active') then
    raise exception 'Status de plano inválido' using errcode = '22023';
  end if;

  if p_plan_id is not null and p_plan_id not in ('starter', 'individual', 'escritorio', 'juridico', 'corporativo') then
    raise exception 'plan_id inválido' using errcode = '22023';
  end if;

  select (plan_status = 'active') into v_was_active from organizations where id = p_org_id;

  -- tier efetivo pro calculo do recibo: o informado agora, senao o que a
  -- organizacao ja tinha, senao starter (mesmo default de hoje).
  v_plan_id := coalesce(p_plan_id, (select plan_id from organizations where id = p_org_id), 'starter');

  update public.organizations
  set plan_status = p_status,
      plan_id = case when p_plan_id is not null then p_plan_id else plan_id end,
      plan_renews_at = case
        when p_status = 'active' and (plan_renews_at is null or plan_renews_at < now())
          then now() + interval '30 days'
        when p_status = 'trial' then null
        else plan_renews_at
      end
  where id = p_org_id;

  -- Recibo do primeiro pagamento -- so quando a organizacao nao estava
  -- ativa antes (evita duplicar recibo se o status for tocado de novo
  -- sem sair de active). Valor/descricao agora dependem do tier.
  if p_status = 'active' and not coalesce(v_was_active, false) then
    v_amount_cents := case v_plan_id
      when 'individual' then 19900
      when 'escritorio' then 49900
      when 'juridico' then 89900
      when 'corporativo' then 174900
      else 49000 -- starter (legado)
    end;
    v_plan_label := case v_plan_id
      when 'individual' then 'Individual'
      when 'escritorio' then 'Escritório'
      when 'juridico' then 'Jurídico'
      when 'corporativo' then 'Corporativo'
      else 'Starter'
    end;
    insert into public.billing_receipts (org_id, amount_cents, description)
    values (p_org_id, v_amount_cents, 'Primeiro pagamento — Plano ' || v_plan_label);
  end if;
end;
$$;
