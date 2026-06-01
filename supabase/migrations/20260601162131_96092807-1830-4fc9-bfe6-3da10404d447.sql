-- 1. ENUMS
CREATE TYPE public.person_role AS ENUM ('ic_team','composer','artist','supervisor');
CREATE TYPE public.calendar_subject_type AS ENUM ('person','production');
ALTER TYPE public.availability_kind ADD VALUE IF NOT EXISTS 'produccion';

-- 2. PEOPLE
CREATE TABLE public.people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.person_role NOT NULL,
  full_name text NOT NULL,
  email text,
  phone text,
  notes text,
  composer_id uuid REFERENCES public.composers(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (composer_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.people TO authenticated;
GRANT ALL ON public.people TO service_role;
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
CREATE POLICY "people read" ON public.people FOR SELECT TO authenticated USING (true);
CREATE POLICY "people admin write" ON public.people FOR ALL TO authenticated
  USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
CREATE TRIGGER people_touch BEFORE UPDATE ON public.people
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX people_role_idx ON public.people(role);
CREATE INDEX people_composer_idx ON public.people(composer_id);

-- 3. PRODUCTIONS
CREATE TABLE public.productions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  kind text,
  year integer,
  production_company text,
  director text,
  platform text,
  notes text,
  color text DEFAULT '#6366f1',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.productions TO authenticated;
GRANT ALL ON public.productions TO service_role;
ALTER TABLE public.productions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "productions read" ON public.productions FOR SELECT TO authenticated USING (true);
CREATE POLICY "productions admin write" ON public.productions FOR ALL TO authenticated
  USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
CREATE TRIGGER productions_touch BEFORE UPDATE ON public.productions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 4. PRODUCTION ASSIGNMENTS
CREATE TABLE public.production_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_id uuid NOT NULL REFERENCES public.productions(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  role_in_project text,
  start_date date,
  end_date date,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_assignments TO authenticated;
GRANT ALL ON public.production_assignments TO service_role;
ALTER TABLE public.production_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prod_assign read" ON public.production_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "prod_assign admin write" ON public.production_assignments FOR ALL TO authenticated
  USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
CREATE INDEX prod_assign_prod_idx ON public.production_assignments(production_id);
CREATE INDEX prod_assign_person_idx ON public.production_assignments(person_id);

-- 5. CALENDAR EVENTS
CREATE TABLE public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type public.calendar_subject_type NOT NULL,
  subject_id uuid NOT NULL,
  kind public.availability_kind NOT NULL DEFAULT 'ocupado',
  title text,
  note text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_events TO authenticated;
GRANT ALL ON public.calendar_events TO service_role;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "calendar_events read" ON public.calendar_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "calendar_events admin write" ON public.calendar_events FOR ALL TO authenticated
  USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
CREATE TRIGGER calendar_events_touch BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX calendar_events_range_idx ON public.calendar_events(start_date, end_date);
CREATE INDEX calendar_events_subject_idx ON public.calendar_events(subject_type, subject_id);

-- 6. SEED people from existing composers + keep in sync
INSERT INTO public.people (role, full_name, email, composer_id)
SELECT 'composer'::public.person_role, c.full_name, c.email, c.id
FROM public.composers c
ON CONFLICT (composer_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.sync_composer_to_people()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.people (role, full_name, email, composer_id)
    VALUES ('composer', NEW.full_name, NEW.email, NEW.id)
    ON CONFLICT (composer_id) DO NOTHING;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.people
       SET full_name = NEW.full_name,
           email = NEW.email,
           updated_at = now()
     WHERE composer_id = NEW.id;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER composers_sync_people
AFTER INSERT OR UPDATE OF full_name, email ON public.composers
FOR EACH ROW EXECUTE FUNCTION public.sync_composer_to_people();