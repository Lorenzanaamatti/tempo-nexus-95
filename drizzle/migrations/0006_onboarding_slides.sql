CREATE TABLE public.onboarding_slides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position integer NOT NULL DEFAULT 0,
  chapter text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  media jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.onboarding_slides TO authenticated;
GRANT ALL ON public.onboarding_slides TO service_role;
ALTER TABLE public.onboarding_slides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "onboarding_slides staff read" ON public.onboarding_slides FOR SELECT TO authenticated USING (public.current_user_is_staff());
CREATE POLICY "onboarding_slides admin write" ON public.onboarding_slides FOR ALL TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
CREATE TRIGGER onboarding_slides_touch BEFORE UPDATE ON public.onboarding_slides FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.onboarding_progress (
  user_id uuid PRIMARY KEY,
  last_position integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.onboarding_progress TO authenticated;
GRANT ALL ON public.onboarding_progress TO service_role;
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "onboarding_progress own or admin read" ON public.onboarding_progress FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.current_user_is_admin());
CREATE POLICY "onboarding_progress own insert" ON public.onboarding_progress FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.current_user_is_staff());
CREATE POLICY "onboarding_progress own update" ON public.onboarding_progress FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "onboarding media staff read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'onboarding-media' AND public.current_user_is_staff());
CREATE POLICY "onboarding media admin insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'onboarding-media' AND public.current_user_is_admin());
CREATE POLICY "onboarding media admin delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'onboarding-media' AND public.current_user_is_admin());