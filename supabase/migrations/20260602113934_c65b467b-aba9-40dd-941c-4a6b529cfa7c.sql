-- Plataformas CRM
CREATE TABLE public.platforms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_name text,
  email text,
  phone text,
  website text,
  country text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platforms TO authenticated;
GRANT ALL ON public.platforms TO service_role;
ALTER TABLE public.platforms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "platforms read" ON public.platforms FOR SELECT TO authenticated USING (true);
CREATE POLICY "platforms admin write" ON public.platforms FOR ALL TO authenticated USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());
CREATE TRIGGER platforms_touch BEFORE UPDATE ON public.platforms FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Extend productoras with contractual / fiscal data
ALTER TABLE public.production_companies
  ADD COLUMN legal_name text,
  ADD COLUMN cif text,
  ADD COLUMN address text,
  ADD COLUMN area_managers text,
  ADD COLUMN contract_notes text;

-- Extend productions with new people roles, plataforma FK and premiere date
ALTER TABLE public.productions
  ADD COLUMN platform_id uuid REFERENCES public.platforms(id) ON DELETE SET NULL,
  ADD COLUMN production_director_person_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  ADD COLUMN postproduction_supervisor_person_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  ADD COLUMN music_supervisor_person_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  ADD COLUMN other_responsibles text,
  ADD COLUMN premiere_date date;

CREATE INDEX idx_productions_platform_id ON public.productions(platform_id);