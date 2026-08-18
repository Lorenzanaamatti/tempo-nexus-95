CREATE POLICY "production docs read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'production-docs' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'team')));
CREATE POLICY "production docs insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'production-docs' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'team')));
CREATE POLICY "production docs update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'production-docs' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'team')))
  WITH CHECK (bucket_id = 'production-docs' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'team')));
CREATE POLICY "production docs delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'production-docs' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'team')));