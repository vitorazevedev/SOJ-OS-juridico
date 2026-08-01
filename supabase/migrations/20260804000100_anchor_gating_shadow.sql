-- Fase 3 (anchor_gating_shadow_v1) da recalibracao do Indice de
-- Desequilibrio: valida, por clausula, se a ancora candidata (a que a
-- Fase A ja escolhe hoje por interpolacao livre em ancora_referencia)
-- realmente atende as condicoes obrigatorias estruturadas importadas na
-- Fase 1 (gating jsonb em public.ancoras), e se algum supressor se
-- aplica. Regra central do banco aprovado: NUNCA usar a ancora so por
-- proximidade semantica -- sem aderencia, o resultado correto e
-- anchor_id=null, matched=false, score=0.
--
-- Shadow mode: essa tabela e so para comparacao/observabilidade. O
-- gravidade/severity/indice_desequilibrio exibidos ao usuario continuam
-- vindo exclusivamente do pipeline atual (Fase A/B), sem nenhuma
-- alteracao. Ativar isso em producao (anchor_gating_v1) e decisao
-- separada, so depois de RG-01 a RG-05, RG-08 e RG-10 passarem.

create table if not exists public.clause_gating_shadow (
  id uuid primary key default gen_random_uuid(),
  clause_id uuid not null references public.clause_risks(id) on delete cascade,
  analysis_id uuid not null references public.contract_analyses(id) on delete cascade,

  -- ancora que a Fase A escolheu hoje por interpolacao livre (o que
  -- clause_risks.ancora_id ja guarda) -- preservado aqui pra comparar
  -- lado a lado com o resultado do gating estruturado.
  candidate_anchor_id uuid references public.ancoras(id),

  -- resultado depois de aplicar as condicoes/supressores estruturados --
  -- null quando nao houve aderencia (regra central, nunca fallback
  -- semantico).
  gating_anchor_id uuid references public.ancoras(id),
  matched boolean not null default false,
  score int not null default 0 check (score >= 0 and score <= 100),

  conditions_met jsonb,
  suppressor_triggered text,
  evidence text,
  qualitative_alert text,

  prompt_version text not null,
  context_schema_version text,
  anchor_bank_version text,
  aggregation_version text not null default 'aggregation-v1-legacy',

  created_at timestamptz not null default now()
);

create index if not exists clause_gating_shadow_clause_id_idx on public.clause_gating_shadow (clause_id);
create index if not exists clause_gating_shadow_analysis_id_idx on public.clause_gating_shadow (analysis_id);

alter table public.clause_gating_shadow enable row level security;

drop policy if exists clause_gating_shadow_select on public.clause_gating_shadow;
create policy clause_gating_shadow_select on public.clause_gating_shadow
  for select using (
    exists (
      select 1 from public.contract_analyses ca
      join public.contracts c on c.id = ca.contract_id
      where ca.id = clause_gating_shadow.analysis_id
        and c.org_id = public.get_org_id()
    )
    or exists (
      select 1 from public.users where id = auth.uid() and is_ponderum_staff = true
    )
  );
