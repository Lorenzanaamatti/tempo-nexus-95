CREATE TABLE public.app_page_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  email text,
  path text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  duration_seconds integer NOT NULL DEFAULT 0
);
CREATE INDEX app_page_visits_started_idx ON public.app_page_visits (started_at DESC);
CREATE INDEX app_page_visits_user_idx ON public.app_page_visits (user_id, started_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.app_page_visits TO authenticated;
GRANT ALL ON public.app_page_visits TO service_role;
ALTER TABLE public.app_page_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own visits insert" ON public.app_page_visits FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own visits update" ON public.app_page_visits FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "big c reads visits" ON public.app_page_visits FOR SELECT TO authenticated USING (public.current_user_is_big_c() OR user_id = auth.uid());