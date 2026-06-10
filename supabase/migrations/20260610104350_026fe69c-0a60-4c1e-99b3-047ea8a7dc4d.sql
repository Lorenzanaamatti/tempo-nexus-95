
-- 1) production_phases
CREATE TABLE public.production_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_id uuid NOT NULL REFERENCES public.productions(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'planificada',
  notes text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_phases TO authenticated;
GRANT ALL ON public.production_phases TO service_role;

ALTER TABLE public.production_phases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "phases admin all" ON public.production_phases
  FOR ALL TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

CREATE POLICY "phases composer read" ON public.production_phases
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.productions p
    WHERE p.id = production_phases.production_id
      AND public.can_access_composer(p.composer_id)
  ));

CREATE TRIGGER production_phases_touch
  BEFORE UPDATE ON public.production_phases
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2) visible_to_composer on calendar_events + press tables
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS visible_to_composer boolean NOT NULL DEFAULT true;
ALTER TABLE public.press_clippings   ADD COLUMN IF NOT EXISTS visible_to_composer boolean NOT NULL DEFAULT true;
ALTER TABLE public.press_kits        ADD COLUMN IF NOT EXISTS visible_to_composer boolean NOT NULL DEFAULT true;

-- 3) source_phase_id on calendar_events to mirror phases
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS source_phase_id uuid;

-- 4) trigger: sync phases -> calendar_events (operativo on production subject)
CREATE OR REPLACE FUNCTION public.sync_production_phase_calendar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _prod_title text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.calendar_events WHERE source_phase_id = OLD.id;
    RETURN OLD;
  END IF;

  DELETE FROM public.calendar_events WHERE source_phase_id = NEW.id;

  IF NEW.start_date IS NULL OR NEW.end_date IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT title INTO _prod_title FROM public.productions WHERE id = NEW.production_id;

  INSERT INTO public.calendar_events (
    subject_type, subject_id, kind, calendar_category,
    start_date, end_date, title, note, source_phase_id, source_kind
  ) VALUES (
    'production', NEW.production_id, 'fase', 'operativo',
    NEW.start_date, NEW.end_date,
    'Fase · ' || NEW.name || coalesce(' — ' || _prod_title, ''),
    NEW.notes, NEW.id, 'production_phase'
  );

  RETURN NEW;
END $$;

CREATE TRIGGER production_phases_calendar_sync
  AFTER INSERT OR UPDATE OR DELETE ON public.production_phases
  FOR EACH ROW EXECUTE FUNCTION public.sync_production_phase_calendar();
