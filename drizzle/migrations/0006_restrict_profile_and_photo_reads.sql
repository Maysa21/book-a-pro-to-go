DROP POLICY IF EXISTS "profiles readable by signed in" ON public.profiles;
CREATE POLICY "profiles readable by self or related" ON public.profiles FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.bookings bk JOIN public.businesses b ON b.id = bk.business_id
             WHERE (b.owner_id = auth.uid() AND bk.client_id = profiles.id)
                OR (bk.client_id = auth.uid() AND b.owner_id = profiles.id))
  OR EXISTS (SELECT 1 FROM public.messages m JOIN public.businesses b ON b.id = m.business_id
             WHERE (b.owner_id = auth.uid() AND m.client_id = profiles.id)
                OR (m.client_id = auth.uid() AND b.owner_id = profiles.id))
);
DROP POLICY IF EXISTS "business photo readable" ON storage.objects;
CREATE POLICY "business photo readable" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'business-photos' AND (
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
    OR EXISTS (SELECT 1 FROM public.businesses b
               WHERE b.photo_path = objects.name AND b.published
                 AND (storage.foldername(objects.name))[1] = b.owner_id::text)
  )
);