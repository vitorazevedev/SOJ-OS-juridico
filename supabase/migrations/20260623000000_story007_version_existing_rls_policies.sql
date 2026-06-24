-- STORY-007: bring the RLS policies that already exist in production under version control.
-- These policies were created directly in the Supabase dashboard (pre-dating this repo's
-- migration history) and were confirmed via live audit on 2026-06-23 (see STORY-007 Dev
-- Agent Record). This migration reproduces them exactly — DROP + CREATE is idempotent and
-- intentionally a no-op against the already-correct live state; its purpose is auditability,
-- not behavior change.

-- contracts
DROP POLICY IF EXISTS "contracts_select" ON public.contracts;
CREATE POLICY "contracts_select" ON public.contracts FOR SELECT TO authenticated
  USING (org_id = public.get_org_id());

DROP POLICY IF EXISTS "contracts_insert" ON public.contracts;
CREATE POLICY "contracts_insert" ON public.contracts FOR INSERT TO authenticated
  WITH CHECK (org_id = public.get_org_id());

DROP POLICY IF EXISTS "contracts_update" ON public.contracts;
CREATE POLICY "contracts_update" ON public.contracts FOR UPDATE TO authenticated
  USING (org_id = public.get_org_id());

DROP POLICY IF EXISTS "contracts_delete" ON public.contracts;
CREATE POLICY "contracts_delete" ON public.contracts FOR DELETE TO authenticated
  USING (org_id = public.get_org_id());

-- contract_contents (no org_id column — scoped via parent contract)
DROP POLICY IF EXISTS "contents_select" ON public.contract_contents;
CREATE POLICY "contents_select" ON public.contract_contents FOR SELECT TO authenticated
  USING (contract_id IN (SELECT id FROM public.contracts WHERE org_id = public.get_org_id()));

DROP POLICY IF EXISTS "contents_insert" ON public.contract_contents;
CREATE POLICY "contents_insert" ON public.contract_contents FOR INSERT TO authenticated
  WITH CHECK (contract_id IN (SELECT id FROM public.contracts WHERE org_id = public.get_org_id()));

-- contract_analyses (no org_id column — scoped via parent contract)
DROP POLICY IF EXISTS "analyses_select" ON public.contract_analyses;
CREATE POLICY "analyses_select" ON public.contract_analyses FOR SELECT TO authenticated
  USING (contract_id IN (SELECT id FROM public.contracts WHERE org_id = public.get_org_id()));

DROP POLICY IF EXISTS "analyses_insert" ON public.contract_analyses;
CREATE POLICY "analyses_insert" ON public.contract_analyses FOR INSERT TO authenticated
  WITH CHECK (contract_id IN (SELECT id FROM public.contracts WHERE org_id = public.get_org_id()));

-- clause_risks (scoped via parent analysis -> contract)
DROP POLICY IF EXISTS "clauses_select" ON public.clause_risks;
CREATE POLICY "clauses_select" ON public.clause_risks FOR SELECT TO authenticated
  USING (analysis_id IN (
    SELECT a.id FROM public.contract_analyses a
    JOIN public.contracts c ON c.id = a.contract_id
    WHERE c.org_id = public.get_org_id()
  ));

DROP POLICY IF EXISTS "clauses_insert" ON public.clause_risks;
CREATE POLICY "clauses_insert" ON public.clause_risks FOR INSERT TO authenticated
  WITH CHECK (analysis_id IN (
    SELECT a.id FROM public.contract_analyses a
    JOIN public.contracts c ON c.id = a.contract_id
    WHERE c.org_id = public.get_org_id()
  ));

-- financial_impacts (scoped via parent analysis -> contract; table unused by app code today)
DROP POLICY IF EXISTS "financial_select" ON public.financial_impacts;
CREATE POLICY "financial_select" ON public.financial_impacts FOR SELECT TO authenticated
  USING (analysis_id IN (
    SELECT a.id FROM public.contract_analyses a
    JOIN public.contracts c ON c.id = a.contract_id
    WHERE c.org_id = public.get_org_id()
  ));

-- contract_obligations
DROP POLICY IF EXISTS "obligations_all" ON public.contract_obligations;
CREATE POLICY "obligations_all" ON public.contract_obligations FOR ALL TO authenticated
  USING (org_id = public.get_org_id());

-- generated_contracts
DROP POLICY IF EXISTS "generated_all" ON public.generated_contracts;
CREATE POLICY "generated_all" ON public.generated_contracts FOR ALL TO authenticated
  USING (org_id = public.get_org_id());

-- organizations
DROP POLICY IF EXISTS "org_select" ON public.organizations;
CREATE POLICY "org_select" ON public.organizations FOR SELECT TO authenticated
  USING (id = public.get_org_id());

DROP POLICY IF EXISTS "org_update" ON public.organizations;
CREATE POLICY "org_update" ON public.organizations FOR UPDATE TO authenticated
  USING (id = public.get_org_id());

-- audit_logs (read-only for clients — writes happen only via SECURITY DEFINER trigger, see
-- 20260623000100_story007_audit_log_triggers.sql)
DROP POLICY IF EXISTS "audit_select" ON public.audit_logs;
CREATE POLICY "audit_select" ON public.audit_logs FOR SELECT TO authenticated
  USING (org_id = public.get_org_id());
