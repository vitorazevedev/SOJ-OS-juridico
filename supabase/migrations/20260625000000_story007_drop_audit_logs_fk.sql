-- STORY-007 follow-up: the audit_contracts trigger inserts into audit_logs as part of the
-- same cascading DELETE that removes the organization row (contracts cascade-delete when
-- their org is deleted). By the time that INSERT runs, the referenced organizations row no
-- longer exists in this same statement, so the FK constraint on audit_logs.org_id rejects
-- the very audit entry meant to record the deletion. SET NULL (the previous fix) only
-- helps for *existing* historical rows when their org is later deleted — it doesn't help
-- here because this is a *new* insert referencing an org_id that's disappearing in the same
-- transaction.
--
-- Fix: audit/log tables conventionally don't enforce FK integrity against the entities they
-- audit, precisely so the log survives deletion of (or, as here, concurrent deletion during)
-- the audited entity. Drop both FKs; keep org_id/user_id as plain UUID columns for filtering.
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_org_id_fkey;
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;
