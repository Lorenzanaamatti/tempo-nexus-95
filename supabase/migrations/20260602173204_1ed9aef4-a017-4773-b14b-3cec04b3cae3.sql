
DROP POLICY IF EXISTS "composer-photos public read by path" ON storage.objects;
CREATE POLICY "composer-photos admin or owner read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'composer-photos'
  AND (public.current_user_is_admin() OR public.can_access_composer(((storage.foldername(name))[1])::uuid))
);

DROP POLICY IF EXISTS "productions read" ON public.productions;
CREATE POLICY "productions read" ON public.productions FOR SELECT TO authenticated
USING (public.current_user_is_admin() OR (composer_id IS NOT NULL AND public.can_access_composer(composer_id)));

DROP POLICY IF EXISTS "billing_sprints read" ON public.production_billing_sprints;
CREATE POLICY "billing_sprints read" ON public.production_billing_sprints FOR SELECT TO authenticated
USING (
  public.current_user_is_admin()
  OR EXISTS (
    SELECT 1 FROM public.productions p
    WHERE p.id = production_billing_sprints.production_id
      AND p.composer_id IS NOT NULL
      AND public.can_access_composer(p.composer_id)
  )
);

DROP POLICY IF EXISTS "people read" ON public.people;
CREATE POLICY "people read" ON public.people FOR SELECT TO authenticated
USING (public.current_user_is_admin() OR (composer_id IS NOT NULL AND public.can_access_composer(composer_id)));

DROP POLICY IF EXISTS "contracts read" ON public.contracts;
CREATE POLICY "contracts read" ON public.contracts FOR SELECT TO authenticated
USING (
  public.current_user_is_admin()
  OR (composer_id IS NOT NULL AND public.can_access_composer(composer_id))
  OR (signer_composer_id IS NOT NULL AND public.can_access_composer(signer_composer_id))
);

DROP POLICY IF EXISTS "contract_counterparties read" ON public.contract_counterparties;
CREATE POLICY "contract_counterparties read" ON public.contract_counterparties FOR SELECT TO authenticated
USING (
  public.current_user_is_admin()
  OR EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id = contract_counterparties.contract_id
      AND (
        (c.composer_id IS NOT NULL AND public.can_access_composer(c.composer_id))
        OR (c.signer_composer_id IS NOT NULL AND public.can_access_composer(c.signer_composer_id))
      )
  )
);

DROP POLICY IF EXISTS "directors read" ON public.directors;
CREATE POLICY "directors read" ON public.directors FOR SELECT TO authenticated USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "platforms read" ON public.platforms;
CREATE POLICY "platforms read" ON public.platforms FOR SELECT TO authenticated USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "prod_companies read" ON public.production_companies;
CREATE POLICY "prod_companies read" ON public.production_companies FOR SELECT TO authenticated USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "opportunities read" ON public.opportunities;
CREATE POLICY "opportunities read" ON public.opportunities FOR SELECT TO authenticated USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "opp_actions read" ON public.opportunity_actions;
CREATE POLICY "opp_actions read" ON public.opportunity_actions FOR SELECT TO authenticated USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "opp_candidates read" ON public.opportunity_candidates;
CREATE POLICY "opp_candidates read" ON public.opportunity_candidates FOR SELECT TO authenticated USING (public.current_user_is_admin());

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.composers_autolink_trg() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_billing_sprint_calendar() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_composer_to_people() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.link_composer_to_user(uuid) FROM PUBLIC, anon, authenticated;
