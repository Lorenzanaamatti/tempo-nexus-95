
-- 1) social_campaigns: restrict SELECT to authenticated
DROP POLICY IF EXISTS "social_campaigns read" ON public.social_campaigns;
CREATE POLICY "social_campaigns read"
  ON public.social_campaigns FOR SELECT
  TO authenticated
  USING (public.current_user_is_admin() OR public.can_access_composer(composer_id));

-- 2) press_clippings: restrict SELECT to authenticated
DO $$
DECLARE _p text;
BEGIN
  FOR _p IN SELECT polname FROM pg_policy WHERE polrelid = 'public.press_clippings'::regclass AND polcmd = 'r' LOOP
    EXECUTE format('DROP POLICY %I ON public.press_clippings', _p);
  END LOOP;
END $$;
CREATE POLICY "press_clippings read"
  ON public.press_clippings FOR SELECT
  TO authenticated
  USING (public.current_user_is_admin() OR composer_id IS NULL OR public.can_access_composer(composer_id));

-- 3) press_kits: restrict SELECT to authenticated
DO $$
DECLARE _p text;
BEGIN
  FOR _p IN SELECT polname FROM pg_policy WHERE polrelid = 'public.press_kits'::regclass AND polcmd = 'r' LOOP
    EXECUTE format('DROP POLICY %I ON public.press_kits', _p);
  END LOOP;
END $$;
CREATE POLICY "press_kits read"
  ON public.press_kits FOR SELECT
  TO authenticated
  USING (public.current_user_is_admin() OR composer_id IS NULL OR public.can_access_composer(composer_id));

-- 4) providers: restrict 'shared_with_ic' rows to admin only
DROP POLICY IF EXISTS "Composers read own and shared providers" ON public.providers;
CREATE POLICY "Composers read own providers"
  ON public.providers FOR SELECT
  TO authenticated
  USING (
    public.current_user_is_admin()
    OR (composer_id IS NOT NULL AND public.can_access_composer(composer_id))
  );

-- 5) opportunity_candidates: admin-only SELECT (drop composer visibility)
DO $$
DECLARE _p text;
BEGIN
  FOR _p IN SELECT polname FROM pg_policy WHERE polrelid = 'public.opportunity_candidates'::regclass AND polcmd = 'r' LOOP
    EXECUTE format('DROP POLICY %I ON public.opportunity_candidates', _p);
  END LOOP;
END $$;
CREATE POLICY "opportunity_candidates admin read"
  ON public.opportunity_candidates FOR SELECT
  TO authenticated
  USING (public.current_user_is_admin());
