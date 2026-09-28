DROP POLICY IF EXISTS "actions admin write" ON public.actions;
DROP POLICY IF EXISTS "actions read" ON public.actions;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.actions TO authenticated;
GRANT ALL ON public.actions TO service_role;
CREATE POLICY "actions staff read" ON public.actions FOR SELECT TO authenticated USING (public.current_user_is_staff());
CREATE POLICY "actions staff insert" ON public.actions FOR INSERT TO authenticated WITH CHECK (public.current_user_is_staff());
CREATE POLICY "actions staff update" ON public.actions FOR UPDATE TO authenticated USING (public.current_user_is_staff()) WITH CHECK (public.current_user_is_staff());
CREATE POLICY "actions admin delete" ON public.actions FOR DELETE TO authenticated USING (public.current_user_is_admin() OR requester_user_id = auth.uid());