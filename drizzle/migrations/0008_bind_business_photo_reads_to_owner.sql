DROP POLICY IF EXISTS "business photo readable" ON storage.objects;
CREATE POLICY "business photo readable" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'business-photos' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);