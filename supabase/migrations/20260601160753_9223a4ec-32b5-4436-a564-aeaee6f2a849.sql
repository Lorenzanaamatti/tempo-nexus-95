-- 1) Nuevo enum para tipos de disponibilidad por periodo
CREATE TYPE public.availability_kind AS ENUM ('libre', 'ocupado', 'vacaciones', 'personal');

-- 2) Tabla de periodos de disponibilidad
CREATE TABLE public.composer_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  composer_id uuid NOT NULL,
  kind public.availability_kind NOT NULL DEFAULT 'libre',
  start_date date NOT NULL,
  end_date date NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT composer_availability_dates_chk CHECK (end_date >= start_date)
);

CREATE INDEX composer_availability_composer_idx ON public.composer_availability(composer_id);
CREATE INDEX composer_availability_range_idx ON public.composer_availability(start_date, end_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.composer_availability TO authenticated;
GRANT ALL ON public.composer_availability TO service_role;

ALTER TABLE public.composer_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "composer_availability all"
  ON public.composer_availability
  FOR ALL
  TO authenticated
  USING (public.can_access_composer(composer_id))
  WITH CHECK (public.can_access_composer(composer_id));

-- Vista general (calendario IC) — admin lee todo gracias a la policy + helper
CREATE POLICY "composer_availability admin read all"
  ON public.composer_availability
  FOR SELECT
  TO authenticated
  USING (public.current_user_is_admin());

CREATE TRIGGER composer_availability_touch
  BEFORE UPDATE ON public.composer_availability
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3) Tabla de histórico económico de proyectos
CREATE TABLE public.composer_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  composer_id uuid NOT NULL,
  production text NOT NULL,
  production_type text,
  music_type text,
  production_company text,
  director text,
  platform text,
  year integer,
  price_charged numeric(12,2),
  production_cost numeric(12,2),
  net_margin numeric(12,2),
  agency_commission numeric(12,2),
  composer_profit numeric(12,2),
  notes text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX composer_projects_composer_idx ON public.composer_projects(composer_id);
CREATE INDEX composer_projects_year_idx ON public.composer_projects(year);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.composer_projects TO authenticated;
GRANT ALL ON public.composer_projects TO service_role;

ALTER TABLE public.composer_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "composer_projects all"
  ON public.composer_projects
  FOR ALL
  TO authenticated
  USING (public.can_access_composer(composer_id))
  WITH CHECK (public.can_access_composer(composer_id));

CREATE TRIGGER composer_projects_touch
  BEFORE UPDATE ON public.composer_projects
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
