
DROP POLICY IF EXISTS "opportunities read" ON public.opportunities;
CREATE POLICY "opportunities read" ON public.opportunities FOR SELECT USING (current_user_is_admin());

DROP POLICY IF EXISTS "person_ic_functions read" ON public.person_ic_functions;
CREATE POLICY "person_ic_functions read" ON public.person_ic_functions FOR SELECT USING (current_user_is_admin());

DROP POLICY IF EXISTS "press_clippings read" ON public.press_clippings;
CREATE POLICY "press_clippings read" ON public.press_clippings FOR SELECT USING (current_user_is_admin() OR composer_id IS NULL OR can_access_composer(composer_id));

DROP POLICY IF EXISTS "press_kits read" ON public.press_kits;
CREATE POLICY "press_kits read" ON public.press_kits FOR SELECT USING (current_user_is_admin() OR composer_id IS NULL OR can_access_composer(composer_id));

DROP POLICY IF EXISTS "social_campaigns read" ON public.social_campaigns;
CREATE POLICY "social_campaigns read" ON public.social_campaigns FOR SELECT USING (current_user_is_admin() OR (composer_id IS NOT NULL AND can_access_composer(composer_id)));
