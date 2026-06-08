
CREATE TABLE public.person_verifier_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  verifier_person_id uuid NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  start_date date,
  objectives text,
  kpi_review text,
  kpi_review_date date,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pva_no_self CHECK (person_id <> verifier_person_id)
);

CREATE INDEX idx_pva_person ON public.person_verifier_assignments(person_id);
CREATE INDEX idx_pva_verifier ON public.person_verifier_assignments(verifier_person_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.person_verifier_assignments TO authenticated;
GRANT ALL ON public.person_verifier_assignments TO service_role;

ALTER TABLE public.person_verifier_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pva admin write" ON public.person_verifier_assignments
  FOR ALL TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

CREATE POLICY "pva read authenticated" ON public.person_verifier_assignments
  FOR SELECT TO authenticated
  USING (true);

CREATE TRIGGER touch_pva_updated_at
  BEFORE UPDATE ON public.person_verifier_assignments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
