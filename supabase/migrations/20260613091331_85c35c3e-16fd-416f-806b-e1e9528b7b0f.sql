
DROP POLICY IF EXISTS "opportunity_candidates admin read" ON public.opportunity_candidates;
CREATE POLICY "opportunity_candidates read"
  ON public.opportunity_candidates FOR SELECT
  TO authenticated
  USING (public.current_user_is_admin() OR public.can_access_composer(composer_id));
