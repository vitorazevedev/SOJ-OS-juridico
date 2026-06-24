-- Storage policies for the 'contracts' bucket so that org members can upload/read files inside their org folder
-- Policies are scoped by checking that the first folder matches the user's org_id

-- Allow org members to read files in their org folder (covers logos and generated contracts)
DROP POLICY IF EXISTS "contracts_org_select" ON storage.objects;
CREATE POLICY "contracts_org_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'contracts'
  AND (storage.foldername(name))[1] = public.get_org_id()::text
);

-- Allow org members to upload to their org folder
DROP POLICY IF EXISTS "contracts_org_insert" ON storage.objects;
CREATE POLICY "contracts_org_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'contracts'
  AND (storage.foldername(name))[1] = public.get_org_id()::text
);

-- Allow org members to update (upsert) files in their org folder
DROP POLICY IF EXISTS "contracts_org_update" ON storage.objects;
CREATE POLICY "contracts_org_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'contracts'
  AND (storage.foldername(name))[1] = public.get_org_id()::text
);

-- Allow org members to delete files in their org folder
DROP POLICY IF EXISTS "contracts_org_delete" ON storage.objects;
CREATE POLICY "contracts_org_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'contracts'
  AND (storage.foldername(name))[1] = public.get_org_id()::text
);