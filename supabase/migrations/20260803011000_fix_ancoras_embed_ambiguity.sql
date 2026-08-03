-- phase_a_ancora_id ganhou uma FK pra ancoras na migration anterior, criando
-- uma segunda relação entre clause_risks e ancoras — o PostgREST não
-- consegue mais resolver o embed implícito `ancoras(...)` usado pela Fase B
-- (erro "more than one relationship was found"). A coluna é só um snapshot
-- de observabilidade (o que a Fase A propôs originalmente); nunca é
-- consultada via join, então não precisa de integridade referencial.
alter table public.clause_risks
  drop constraint if exists clause_risks_phase_a_ancora_id_fkey;
