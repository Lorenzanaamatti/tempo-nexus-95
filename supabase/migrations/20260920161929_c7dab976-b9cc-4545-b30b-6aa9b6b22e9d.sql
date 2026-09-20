
CREATE TABLE IF NOT EXISTS public.phase_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text,
  requires_detail boolean NOT NULL DEFAULT false,
  requires_place boolean NOT NULL DEFAULT false,
  allows_multiple boolean NOT NULL DEFAULT false,
  is_premiere boolean NOT NULL DEFAULT false,
  default_owner text NOT NULL DEFAULT 'representado',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.phase_catalog TO authenticated;
GRANT ALL ON public.phase_catalog TO service_role;

ALTER TABLE public.phase_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read phase catalog" ON public.phase_catalog
  FOR SELECT TO authenticated USING (public.current_user_is_staff());
CREATE POLICY "staff write phase catalog" ON public.phase_catalog
  FOR ALL TO authenticated USING (public.current_user_is_staff()) WITH CHECK (public.current_user_is_staff());

CREATE TRIGGER phase_catalog_touch BEFORE UPDATE ON public.phase_catalog
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.production_phases
  ADD COLUMN IF NOT EXISTS detail text,
  ADD COLUMN IF NOT EXISTS place text,
  ADD COLUMN IF NOT EXISTS people text,
  ADD COLUMN IF NOT EXISTS catalog_id uuid REFERENCES public.phase_catalog(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_premiere boolean NOT NULL DEFAULT false;

INSERT INTO public.phase_catalog (name, requires_detail, requires_place, allows_multiple, is_premiere, default_owner, position) VALUES
  ('Negociación', false, false, false, false, 'agencia', 10),
  ('Contratación', false, false, false, false, 'agencia', 20),
  ('Spotting', false, false, true, false, 'agencia', 30),
  ('Composición', false, false, false, false, 'representado', 40),
  ('Entrega', true, false, true, false, 'representado', 50),
  ('Aprobación maquetas', false, false, true, false, 'productora', 60),
  ('Orquestación', false, false, false, false, 'representado', 70),
  ('Copista', false, false, false, false, 'representado', 80),
  ('Grabación', true, true, true, false, 'representado', 90),
  ('Mezcla de música', false, true, true, false, 'representado', 100),
  ('Masterización', false, true, false, false, 'representado', 110),
  ('Entrega finalizada de músicas', true, false, false, false, 'representado', 120),
  ('Mezcla del audiovisual', false, true, true, false, 'productora', 130),
  ('Entrega créditos', true, false, true, false, 'agencia', 140),
  ('Entrega cue-sheet', true, false, true, false, 'agencia', 150),
  ('Otras entregas', true, false, true, false, 'representado', 160),
  ('Estreno', false, true, true, true, 'agencia', 170)
ON CONFLICT (name) DO NOTHING;

CREATE OR REPLACE FUNCTION public.sync_production_phase_calendar()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _title text; _client text; _start date; _end date; _premiere boolean; _label text; _note text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.calendar_events WHERE source_phase_id = OLD.id;
    RETURN OLD;
  END IF;
  DELETE FROM public.calendar_events WHERE source_phase_id = NEW.id;
  _start := COALESCE(NEW.start_date, NEW.end_date);
  _end := COALESCE(NEW.end_date, NEW.start_date);
  IF _start IS NULL THEN RETURN NEW; END IF;

  SELECT p.title, COALESCE(pc.name, p.production_company, p.partner)
    INTO _title, _client
    FROM public.productions p
    LEFT JOIN public.production_companies pc ON pc.id = p.partner_company_id
   WHERE p.id = NEW.production_id;

  _premiere := COALESCE(NEW.is_premiere, false)
    OR EXISTS (SELECT 1 FROM public.phase_catalog c WHERE c.id = NEW.catalog_id AND c.is_premiere);

  _label := NEW.name;
  IF NEW.detail IS NOT NULL AND btrim(NEW.detail) <> '' THEN
    _label := _label || ' (' || NEW.detail || ')';
  END IF;

  _note := concat_ws(E'\n',
    NULLIF(NEW.notes, ''),
    CASE WHEN NULLIF(btrim(COALESCE(NEW.place,'')), '') IS NOT NULL THEN 'Dónde: ' || NEW.place END,
    CASE WHEN NULLIF(btrim(COALESCE(NEW.people,'')), '') IS NOT NULL THEN 'Quién: ' || NEW.people END,
    CASE WHEN _premiere THEN 'Cliente: ' || COALESCE(_client, 'sin cliente asignado') END
  );

  INSERT INTO public.calendar_events (subject_type, subject_id, kind, calendar_category, start_date, end_date, title, note, source_phase_id, source_kind)
  VALUES ('production', NEW.production_id, 'produccion_fase',
          CASE WHEN _premiere THEN 'marketing'::calendar_category ELSE 'operativo'::calendar_category END,
          _start, _end,
          CASE WHEN _premiere
            THEN 'Estreno · ' || COALESCE(_title,'') || ' — ' || COALESCE(_client, 'sin cliente asignado')
            ELSE 'Fase · ' || _label || ' — ' || COALESCE(_title,'') END,
          NULLIF(_note, ''), NEW.id, 'production_phase');
  RETURN NEW;
END $function$;
