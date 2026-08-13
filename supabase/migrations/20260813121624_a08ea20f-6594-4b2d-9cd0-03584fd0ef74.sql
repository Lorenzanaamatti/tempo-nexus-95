DROP POLICY IF EXISTS "opportunities read" ON public.opportunities;
CREATE POLICY "opportunities read" ON public.opportunities
  FOR SELECT TO authenticated USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "person_ic_functions read" ON public.person_ic_functions;
CREATE POLICY "person_ic_functions read" ON public.person_ic_functions
  FOR SELECT TO authenticated USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "IC can manage candidacy files" ON public.candidacy_files;
CREATE POLICY "IC can manage candidacy files" ON public.candidacy_files
  FOR ALL TO authenticated
  USING (public.current_user_is_admin() OR public.has_role(auth.uid(), 'team'::public.app_role))
  WITH CHECK (public.current_user_is_admin() OR public.has_role(auth.uid(), 'team'::public.app_role));

DROP POLICY IF EXISTS "people-photos admin read" ON storage.objects;
CREATE POLICY "people-photos admin read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'people-photos' AND public.current_user_is_admin());

DROP POLICY IF EXISTS "people-photos admin write" ON storage.objects;
CREATE POLICY "people-photos admin write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'people-photos' AND public.current_user_is_admin());

DROP POLICY IF EXISTS "people-photos admin update" ON storage.objects;
CREATE POLICY "people-photos admin update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'people-photos' AND public.current_user_is_admin());

DROP POLICY IF EXISTS "people-photos admin delete" ON storage.objects;
CREATE POLICY "people-photos admin delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'people-photos' AND public.current_user_is_admin());