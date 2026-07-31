-- Fase 1 (anchor_bank_v1) da recalibracao do Indice de Desequilibrio:
-- enriquece o banco de ancoras com a estrutura completa aprovada pelo
-- Fellipe em 31/07/2026 (release anchor-bank-v1.0.0) -- familia/subfamilia,
-- direcionalidade, aplicabilidade por tipo/finalidade de documento, gating
-- (condicoes obrigatorias/alternativas, agravantes, atenuantes,
-- supressores) e referencias de regressao por ancora.
--
-- Aditivo e sem risco pro pipeline atual: as colunas legadas (titulo,
-- condicoes_disparo, categoria, gravidade_referencia, especie) continuam
-- existindo e sendo as unicas lidas pelo prompt hoje. As colunas novas
-- soa dado parado ate a Fase 3 (anchor_gating_shadow_v1) comecar a
-- consumi-las.

create table if not exists public.risk_families (
  family_id text primary key,
  name text not null,
  definition text not null,
  aggregation_use text,
  status text not null default 'approved_v1'
);

alter table public.risk_families enable row level security;

drop policy if exists risk_families_select on public.risk_families;
create policy risk_families_select on public.risk_families
  for select using (auth.uid() is not null);

-- Uma linha por release do banco de ancoras (hoje so anchor-bank-v1.0.0),
-- guarda os metadados de aprovacao e os parametros globais dessa versao
-- (faixas unificadas, regra de gating, politica de agregacao vigente).
create table if not exists public.anchor_bank_releases (
  id uuid primary key default gen_random_uuid(),
  anchor_bank_version text not null unique,
  release_version text,
  status text not null,
  approved_by text,
  approved_at timestamptz,
  active_anchor_count int,
  inactive_anchor_count int,
  risk_family_count int,
  bands jsonb,
  hard_rule text,
  aggregation_policy jsonb,
  manifest jsonb,
  imported_at timestamptz not null default now()
);

alter table public.anchor_bank_releases enable row level security;

drop policy if exists anchor_bank_releases_select on public.anchor_bank_releases;
create policy anchor_bank_releases_select on public.anchor_bank_releases
  for select using (auth.uid() is not null);

alter table public.ancoras
  add column if not exists anchor_bank_version text,
  add column if not exists family_id text references public.risk_families(family_id),
  add column if not exists subfamily_id text,
  add column if not exists directionality jsonb,
  add column if not exists applicability jsonb,
  add column if not exists gating jsonb,
  add column if not exists regression jsonb,
  add column if not exists approval jsonb,
  add column if not exists technical_notes text,
  add column if not exists source_observation text,
  -- Especifico de ancoras inativas com efeito qualitativo (ex: MULT-04) --
  -- tipo de alerta, gatilho, supressores e razao juridica de nao pontuar.
  add column if not exists qualitative_alert jsonb;

create index if not exists ancoras_family_id_idx on public.ancoras (family_id);
