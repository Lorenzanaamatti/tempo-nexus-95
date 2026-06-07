DROP POLICY IF EXISTS "opp_candidates read" ON public.opportunity_candidates;
CREATE POLICY "opp_candidates read"
  ON public.opportunity_candidates FOR SELECT TO authenticated
  USING (current_user_is_admin() OR can_access_composer(composer_id));

DROP POLICY IF EXISTS "opportunities read" ON public.opportunities;
CREATE POLICY "opportunities read"
  ON public.opportunities FOR SELECT TO authenticated
  USING (
    current_user_is_admin()
    OR EXISTS (
      SELECT 1 FROM public.opportunity_candidates oc
      WHERE oc.opportunity_id = opportunities.id
        AND can_access_composer(oc.composer_id)
    )
  );