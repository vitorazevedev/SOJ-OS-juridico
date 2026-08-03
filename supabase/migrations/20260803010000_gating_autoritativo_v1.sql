-- Gating autoritativo (anchor_gating_v1) — a Fase B (gating por cláusula) passa
-- a ser a autoridade final sobre ancora_id/gravidade, em vez de a Fase A livre
-- decidir sozinha. Campos novos permitem observabilidade (comparar candidato da
-- Fase A vs decisão final do gating) e classificar achados que não têm âncora
-- quantitativa mas ainda são relevantes pro relatório (não podem desaparecer).

alter table public.clause_risks
  add column if not exists finding_type text not null default 'anchored'
    check (finding_type in ('anchored', 'qualitative_unmapped', 'no_finding')),
  add column if not exists qualitative_level text
    check (qualitative_level in ('informativo', 'atencao', 'relevante')),
  add column if not exists gating_reason text,
  add column if not exists phase_a_gravidade numeric,
  add column if not exists phase_a_ancora_id uuid references public.ancoras(id);

comment on column public.clause_risks.finding_type is
  'anchored = âncora quantitativa aprovada pelo gating; qualitative_unmapped = achado relevante sem âncora aplicável (visível, sem score); no_finding = descartado';
comment on column public.clause_risks.phase_a_gravidade is
  'Gravidade candidata original da Fase A, preservada para comparação — não é mais o valor exibido quando anchor_gating_v1 está ativo';
comment on column public.clause_risks.phase_a_ancora_id is
  'Âncora candidata original da Fase A, preservada para comparação — pode divergir de ancora_id (decisão final do gating)';

alter table public.contract_analyses
  add column if not exists anchor_gating_v1_enabled boolean not null default true,
  add column if not exists completeness_review jsonb,
  add column if not exists family_aggregation_shadow jsonb;

comment on column public.contract_analyses.anchor_gating_v1_enabled is
  'true = gating governou o score final desta análise (anchor_gating_v1). false = comportamento legado (Fase A livre), preservado para rollback/comparação';
comment on column public.contract_analyses.family_aggregation_shadow is
  'Agregação por família de âncora (10 famílias) em shadow mode — não afeta indice_desequilibrio exibido nesta release';
