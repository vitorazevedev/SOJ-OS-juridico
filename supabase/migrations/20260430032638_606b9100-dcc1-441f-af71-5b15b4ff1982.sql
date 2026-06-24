
-- Create private bucket for contract files
INSERT INTO storage.buckets (id, name, public)
VALUES ('contracts', 'contracts', false)
ON CONFLICT (id) DO NOTHING;

-- Allow members to view files in their org folder
CREATE POLICY "Org members can view contract files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'contracts'
  AND (storage.foldername(name))[1] = public.get_org_id()::text
);

CREATE POLICY "Org members can upload contract files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'contracts'
  AND (storage.foldername(name))[1] = public.get_org_id()::text
);

CREATE POLICY "Org members can update contract files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'contracts'
  AND (storage.foldername(name))[1] = public.get_org_id()::text
);

CREATE POLICY "Org members can delete contract files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'contracts'
  AND (storage.foldername(name))[1] = public.get_org_id()::text
);
