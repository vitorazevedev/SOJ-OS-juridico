-- Fase 2 (context_shadow_v1) da recalibracao do Indice de Desequilibrio:
-- extracao em shadow mode de document_context + information_flow. So
-- grava dado -- nao afeta risk_score/indice_desequilibrio/gravidade nem
-- exibe nada na UI ainda. Serve pra medir qualidade da inferencia antes
-- do gating de ancora (Fase 3, anchor_gating_shadow_v1).
--
-- Nomes de coluna seguem literalmente o schema aprovado por Fellipe em
-- 31/07/2026 (ponderum-context-v1.0.0, arquivo
-- 05_Ponderum_Context_Flow_Match_Schemas_V1.0.json da entrega
-- Ponderum_Entrega_Vitor_AnchorBank_V1.0) -- em ingles, pra bater exatamente
-- com o contrato tecnico que a equipe do Fellipe vai usar pra validar a
-- regressao (RG-01 a RG-10). document_context e information_flow tem
-- confidence/requires_confirmation/evidence homonimos -- sufixados aqui
-- (_document / _flow) pra caber nas duas na mesma tabela.

create table if not exists public.analysis_shadow_context (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.contract_analyses(id) on delete cascade,

  context_schema_version text not null default 'ponderum-context-v1.0.0',
  prompt_version text not null,

  -- document_context
  document_type text,
  document_purpose text,
  negotiation_stage text,
  represented_party text,
  business_nature text,
  confidence_document numeric check (confidence_document >= 0 and confidence_document <= 1),
  requires_confirmation_document boolean not null default false,
  evidence_document jsonb,

  -- information_flow
  applicable boolean,
  modality text,
  disclosing_parties jsonb,
  receiving_parties jsonb,
  represented_party_role text,
  represented_party_also_discloses boolean,
  confidence_flow numeric check (confidence_flow >= 0 and confidence_flow <= 1),
  requires_confirmation_flow boolean not null default false,
  evidence_flow jsonb,

  extracted_at timestamptz not null default now()
);

create unique index if not exists analysis_shadow_context_analysis_id_idx
  on public.analysis_shadow_context (analysis_id);

alter table public.analysis_shadow_context enable row level security;

-- Mesma visibilidade da analise a que pertence -- membro da org le a
-- propria org, staff le tudo (via is_ponderum_staff, igual outras
-- ferramentas internas de observabilidade).
drop policy if exists analysis_shadow_context_select on public.analysis_shadow_context;
create policy analysis_shadow_context_select on public.analysis_shadow_context
  for select using (
    exists (
      select 1 from public.contract_analyses ca
      join public.contracts c on c.id = ca.contract_id
      where ca.id = analysis_shadow_context.analysis_id
        and c.org_id = public.get_org_id()
    )
    or exists (
      select 1 from public.users where id = auth.uid() and is_ponderum_staff = true
    )
  );
