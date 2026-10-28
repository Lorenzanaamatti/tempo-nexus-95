CREATE POLICY "prod_documents staff write" ON public.production_documents FOR ALL TO authenticated
USING (public.current_user_is_staff()) WITH CHECK (public.current_user_is_staff());