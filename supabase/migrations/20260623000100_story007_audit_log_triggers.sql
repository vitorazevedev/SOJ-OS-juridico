-- STORY-007: activate real audit logging (LGPD Art. 37 — registro de operações).
-- audit_logs existed in the schema but nothing ever wrote to it. This adds a generic,
-- tamper-resistant trigger (SECURITY DEFINER, not callable by client code) that records
-- creation/deletion of contracts and completed analyses — the events called out in the
-- story's acceptance criteria.

-- Fix FK delete behavior first: audit_logs currently uses ON DELETE NO ACTION for both
-- org_id and user_id, which would block account/org deletion (STORY-007's data-rights task)
-- once this table has rows. SET NULL preserves the historical audit trail (anonymized)
-- instead of blocking the delete or cascading the log entries away.
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_org_id_fkey;
ALTER TABLE public.audit_logs
  ADD CONSTRAINT audit_logs_org_id_fkey
  FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE SET NULL;

ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;
ALTER TABLE public.audit_logs
  ADD CONSTRAINT audit_logs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row jsonb;
  v_org_id uuid;
  v_entity_id uuid;
BEGIN
  v_row := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  v_entity_id := (v_row->>'id')::uuid;

  IF v_row ? 'org_id' THEN
    v_org_id := (v_row->>'org_id')::uuid;
  ELSIF v_row ? 'contract_id' THEN
    SELECT org_id INTO v_org_id FROM public.contracts WHERE id = (v_row->>'contract_id')::uuid;
  END IF;

  INSERT INTO public.audit_logs (org_id, user_id, action, entity_type, entity_id)
  VALUES (v_org_id, auth.uid(), lower(TG_OP), TG_TABLE_NAME, v_entity_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Contract creation and deletion
DROP TRIGGER IF EXISTS audit_contracts ON public.contracts;
CREATE TRIGGER audit_contracts
  AFTER INSERT OR DELETE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- Analysis completed (analyze-contract inserts a fresh row per analysis run, including re-analyses)
DROP TRIGGER IF EXISTS audit_contract_analyses ON public.contract_analyses;
CREATE TRIGGER audit_contract_analyses
  AFTER INSERT ON public.contract_analyses
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

REVOKE EXECUTE ON FUNCTION public.log_audit_event() FROM PUBLIC, anon, authenticated;
