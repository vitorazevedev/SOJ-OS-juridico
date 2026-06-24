-- STORY-007 follow-up: REVOKE ... FROM anon left the default PUBLIC-wide EXECUTE grant
-- intact (Postgres grants EXECUTE TO PUBLIC by default on function creation), so anon still
-- had access through that grant. Revoke from PUBLIC explicitly, then re-grant only to the
-- roles that legitimately need it: authenticated (used inside RLS policies evaluated in
-- their session) and service_role (Edge Functions).
REVOKE EXECUTE ON FUNCTION public.get_org_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_org_id() TO authenticated, service_role;
