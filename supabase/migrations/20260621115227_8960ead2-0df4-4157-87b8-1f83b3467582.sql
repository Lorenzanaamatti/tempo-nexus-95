
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS photo_path text;

DROP POLICY IF EXISTS "people-photos admin read" ON storage.objects;
DROP POLICY IF EXISTS "people-photos admin write" ON storage.objects;
DROP POLICY IF EXISTS "people-photos admin update" ON storage.objects;
DROP POLICY IF EXISTS "people-photos admin delete" ON storage.objects;

CREATE POLICY "people-photos admin read" ON storage.objects FOR SELECT
  USING (bucket_id = 'people-photos' AND public.current_user_is_admin());
CREATE POLICY "people-photos admin write" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'people-photos' AND public.current_user_is_admin());
CREATE POLICY "people-photos admin update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'people-photos' AND public.current_user_is_admin());
CREATE POLICY "people-photos admin delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'people-photos' AND public.current_user_is_admin());
