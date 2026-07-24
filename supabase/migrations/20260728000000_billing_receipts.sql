-- Historico de faturamento (Configuracoes > Plano). Sem gateway de
-- pagamento integrado, cada recibo e gerado manualmente pela Equipe
-- Ponderum: no primeiro upgrade (Confirmar upgrade) e em cada renovacao
-- (Renovar assinatura), com data/hora de quando o atendente confirmou o
-- pagamento.

create table if not exists public.billing_receipts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  amount_cents int not null,
  description text not null,
  issued_at timestamptz not null default now()
);

create index if not exists billing_receipts_org_id_idx on public.billing_receipts (org_id);

alter table public.billing_receipts enable row level security;

drop policy if exists billing_receipts_select on public.billing_receipts;
create policy billing_receipts_select on public.billing_receipts
  for select using (org_id = public.get_org_id());

-- Confirmar upgrade (Freemium -> Starter pago) passa a gerar o recibo do
-- primeiro pagamento, alem de definir os +30 dias de renovacao.
create or replace function public.staff_set_org_plan_status(
  p_org_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_was_active boolean;
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

  select (plan_status = 'active') into v_was_active from organizations where id = p_org_id;

  update public.organizations
  set plan_status = p_status,
      plan_renews_at = case
        when p_status = 'active' and (plan_renews_at is null or plan_renews_at < now())
          then now() + interval '30 days'
        when p_status = 'trial' then null
        else plan_renews_at
      end
  where id = p_org_id;

  -- Recibo do primeiro pagamento -- so quando a organizacao nao estava
  -- ativa antes (evita duplicar recibo se o status for tocado de novo
  -- sem sair de active).
  if p_status = 'active' and not coalesce(v_was_active, false) then
    insert into public.billing_receipts (org_id, amount_cents, description)
    values (p_org_id, 49000, 'Primeiro pagamento — Plano Starter');
  end if;
end;
$$;

-- Renovacao: reinicia a contagem de 30 dias e gera o recibo do ciclo.
create or replace function public.staff_renew_org_subscription(
  p_org_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.users
    where id = auth.uid() and is_ponderum_staff = true
  ) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  update public.organizations
  set plan_renews_at = now() + interval '30 days'
  where id = p_org_id and plan_status = 'active';

  insert into public.billing_receipts (org_id, amount_cents, description)
  select p_org_id, 49000, 'Renovação mensal — Plano Starter'
  where exists (select 1 from organizations where id = p_org_id and plan_status = 'active');
end;
$$;
