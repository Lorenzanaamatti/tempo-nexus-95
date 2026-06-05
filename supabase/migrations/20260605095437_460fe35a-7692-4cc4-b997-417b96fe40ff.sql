
ALTER TABLE public.productions
  ADD COLUMN IF NOT EXISTS nomination_date date,
  ADD COLUMN IF NOT EXISTS award_date date;

CREATE OR REPLACE FUNCTION public.sync_production_calendar()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _kinds text[] := ARRAY[
    'prod_delivery','prod_premiere','prod_premiere_announce','prod_premiere_prep',
    'prod_nomination','prod_nomination_announce','prod_nomination_prep',
    'prod_award','prod_award_announce','prod_award_prep'
  ];
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.calendar_events WHERE source_production_id = OLD.id AND source_kind = ANY(_kinds);
    RETURN OLD;
  END IF;

  DELETE FROM public.calendar_events WHERE source_production_id = NEW.id AND source_kind = ANY(_kinds);

  IF NEW.delivery_date IS NOT NULL THEN
    INSERT INTO public.calendar_events (subject_type, subject_id, kind, calendar_category, start_date, end_date, title, source_production_id, source_kind)
    VALUES ('production', NEW.id, 'entrega', 'operativo', NEW.delivery_date, NEW.delivery_date, 'Entrega · ' || NEW.title, NEW.id, 'prod_delivery');
  END IF;

  IF NEW.premiere_date IS NOT NULL THEN
    INSERT INTO public.calendar_events (subject_type, subject_id, kind, calendar_category, start_date, end_date, title, source_production_id, source_kind)
    VALUES
      ('production', NEW.id, 'estreno',              'marketing', NEW.premiere_date,         NEW.premiere_date,         'Estreno · ' || NEW.title,              NEW.id, 'prod_premiere'),
      ('production', NEW.id, 'comunicado_estreno',   'marketing', NEW.premiere_date,         NEW.premiere_date,         'Comunicado estreno · ' || NEW.title,   NEW.id, 'prod_premiere_announce'),
      ('production', NEW.id, 'preparacion_estreno',  'marketing', NEW.premiere_date - 4,     NEW.premiere_date - 4,     'Preparación comunicado estreno · ' || NEW.title, NEW.id, 'prod_premiere_prep');
  END IF;

  IF NEW.nomination_date IS NOT NULL THEN
    INSERT INTO public.calendar_events (subject_type, subject_id, kind, calendar_category, start_date, end_date, title, source_production_id, source_kind)
    VALUES
      ('production', NEW.id, 'nominacion',             'marketing', NEW.nomination_date,     NEW.nomination_date,     'Nominación · ' || NEW.title,             NEW.id, 'prod_nomination'),
      ('production', NEW.id, 'comunicado_nominacion',  'marketing', NEW.nomination_date,     NEW.nomination_date,     'Comunicado nominación · ' || NEW.title,  NEW.id, 'prod_nomination_announce'),
      ('production', NEW.id, 'preparacion_nominacion', 'marketing', NEW.nomination_date - 4, NEW.nomination_date - 4, 'Preparación comunicado nominación · ' || NEW.title, NEW.id, 'prod_nomination_prep');
  END IF;

  IF NEW.award_date IS NOT NULL THEN
    INSERT INTO public.calendar_events (subject_type, subject_id, kind, calendar_category, start_date, end_date, title, source_production_id, source_kind)
    VALUES
      ('production', NEW.id, 'premio',             'marketing', NEW.award_date,     NEW.award_date,     'Premio · ' || NEW.title,             NEW.id, 'prod_award'),
      ('production', NEW.id, 'comunicado_premio',  'marketing', NEW.award_date,     NEW.award_date,     'Comunicado premio · ' || NEW.title,  NEW.id, 'prod_award_announce'),
      ('production', NEW.id, 'preparacion_premio', 'marketing', NEW.award_date - 4, NEW.award_date - 4, 'Preparación comunicado premio · ' || NEW.title, NEW.id, 'prod_award_prep');
  END IF;

  RETURN NEW;
END $function$;

-- Re-run sync for existing productions so new events appear immediately
UPDATE public.productions SET updated_at = now() WHERE premiere_date IS NOT NULL OR nomination_date IS NOT NULL OR award_date IS NOT NULL;
