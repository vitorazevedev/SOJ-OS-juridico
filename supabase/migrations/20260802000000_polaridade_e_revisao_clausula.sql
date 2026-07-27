-- Fase 4 do Indice de Desequilibrio: polaridade por clausula (percentual de quem
-- a clausula onera), detalhamento em 4 sub-scores, e ciclo de revisao manual
-- (revisado/ajustado/descartado/mantido pelo usuario). "Seu padrao" reaproveita
-- ancoras.gravidade_referencia via clause_risks.ancora_id ja existente -- sem
-- tabela nova de playbook (decisao: benchmark de mercado global por enquanto).
--
-- A polaridade em si ainda depende da calibracao de tres passadas descrita na
-- DEC-047 (bloqueadora, pendente de aprovacao do Fellipe) -- os campos abaixo
-- ja sao gravados pela IA, mas a UI deve marcar como "pre-calibracao" ate essa
-- aprovacao formal acontecer.

alter table public.clause_risks
  add column if not exists polaridade_parte_representada numeric check (polaridade_parte_representada >= 0 and polaridade_parte_representada <= 100),
  add column if not exists score_simetria numeric check (score_simetria >= 0 and score_simetria <= 40),
  add column if not exists score_valor_exposto numeric check (score_valor_exposto >= 0 and score_valor_exposto <= 30),
  add column if not exists score_prazo_reversibilidade numeric check (score_prazo_reversibilidade >= 0 and score_prazo_reversibilidade <= 20),
  add column if not exists score_foro_execucao numeric check (score_foro_execucao >= 0 and score_foro_execucao <= 10),
  add column if not exists conclusao text,
  add column if not exists impacto_identificado jsonb,
  add column if not exists mitigacao text,
  add column if not exists review_status text check (review_status in ('revisado', 'ajustado', 'descartado', 'mantido_pelo_usuario')),
  add column if not exists reviewed_at timestamptz;

-- Ciclo de revisao precisa de UPDATE, que hoje nao existe pra clause_risks
-- (so ha SELECT/INSERT, ver 20260623000000_story007_version_existing_rls_policies.sql)
drop policy if exists "clauses_update" on public.clause_risks;
create policy "clauses_update" on public.clause_risks for update to authenticated
  using (analysis_id in (
    select a.id from public.contract_analyses a
    join public.contracts c on c.id = a.contract_id
    where c.org_id = public.get_org_id()
  ))
  with check (analysis_id in (
    select a.id from public.contract_analyses a
    join public.contracts c on c.id = a.contract_id
    where c.org_id = public.get_org_id()
  ));
