-- Allow org members to update other users in the same org (role changes)
DROP POLICY IF EXISTS "users_update" ON public.users;
CREATE POLICY "users_update"
ON public.users
FOR UPDATE
TO authenticated
USING (org_id = public.get_org_id())
WITH CHECK (org_id = public.get_org_id());

-- Allow org members to delete users from their own org
DROP POLICY IF EXISTS "users_delete" ON public.users;
CREATE POLICY "users_delete"
ON public.users
FOR DELETE
TO authenticated
USING (org_id = public.get_org_id());