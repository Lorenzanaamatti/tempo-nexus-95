-- Roles del equipo asignado a un representado
CREATE TYPE public.composer_team_role AS ENUM (
  'agente', 'manager', 'producer', 'comunicacion', 'facturacion', 'pagos', 'otro'
);

CREATE TABLE public.composer_team_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  composer_id uuid NOT NULL REFERENCES public.composers(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  team_role public.composer_team_role NOT NULL,
  role_other text,
  start_date date,
  objectives text,
  kpi_review text,
  kpi_review_date date,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cta_composer ON public.composer_team_assignments(composer_id);
CREATE INDEX idx_cta_person ON public.composer_team_assignments(person_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.composer_team_assignments TO authenticated;
GRANT ALL ON public.composer_team_assignments TO service_role;

ALTER TABLE public.composer_team_assignments ENABLE ROW LEVEL SECURITY;

-- El equipo IC (admins) gestiona todo; el representado puede ver su propio equipo
CREATE POLICY "cta admin write"
  ON public.composer_team_assignments
  FOR ALL TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

CREATE POLICY "cta read by composer access"
  ON public.composer_team_assignments
  FOR SELECT TO authenticated
  USING (public.can_access_composer(composer_id));

CREATE TRIGGER touch_cta_updated_at
  BEFORE UPDATE ON public.composer_team_assignments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();