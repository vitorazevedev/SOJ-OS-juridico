-- STORY-007: address findings from Supabase Security Advisors (run 2026-06-24).

-- 1. function_search_path_mutable (WARN): pin search_path on SECURITY DEFINER / trigger
-- functions so they can't be hijacked by a caller manipulating their session search_path.
CREATE OR REPLACE FUNCTION public.get_org_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  select org_id from public.users where id = auth.uid()
$function$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

-- 2. anon_security_definer_function_executable / authenticated_*: get_org_id() has no
-- legitimate anonymous use case (it resolves from auth.uid(), which is null for anon and
-- would just return null) — revoke from anon, keep for authenticated.
REVOKE EXECUTE ON FUNCTION public.get_org_id() FROM anon;

-- 3. rls_disabled_in_public (ERROR): economic_indexes relied on a bare GRANT SELECT
-- instead of RLS. Same effective access (public read-only reference data, no per-org
-- scoping needed), but RLS + explicit policy is the idiomatic, advisor-clean pattern and
-- makes the "anyone can read, nobody can write via API" intent explicit instead of implicit.
ALTER TABLE public.economic_indexes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "economic_indexes_select" ON public.economic_indexes;
CREATE POLICY "economic_indexes_select" ON public.economic_indexes
  FOR SELECT TO authenticated, anon
  USING (true);
