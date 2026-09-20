CREATE OR REPLACE FUNCTION public.sync_deadline_opportunity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _subject public.calendar_subject_type;
  _cat public.calendar_category;
  _area public.action_area;
  _badge text;
  _name text;
  _deadline date;
  _gala date;
  _opening date;
  _start date;
  _end date;
  _composer uuid;
  _owner uuid;
  _id uuid;
  _link text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.calendar_events WHERE subject_id = OLD.id AND source_kind LIKE 'deadline_%';
    DELETE FROM public.actions WHERE subject_id = OLD.id AND kind = 'tarea' AND subarea = 'preaviso_deadline';
    RETURN OLD;
  END IF;

  _id := NEW.id;
  IF TG_TABLE_NAME = 'oportunidades_subvenciones' THEN
    _subject := 'grant'; _cat := 'legal'; _area := 'legal'; _badge := 'Subvención';
    _name := NEW.nombre_convocatoria; _deadline := NEW.fecha_limite_solicitud;
    _composer := NEW.representado_vinculado;
    _link := '/oportunidades/subvenciones/' || _id::text;
  ELSIF TG_TABLE_NAME = 'oportunidades_festivales' THEN
    _subject := 'festival'; _cat := 'marketing'; _area := 'produccion'; _badge := 'Festival';
    _name := NEW.nombre_festival; _deadline := NEW.fecha_deadline_inscripcion;
    _start := NEW.fecha_inicio; _end := NEW.fecha_fin;
    _composer := NEW.representado_vinculado;
    _link := '/oportunidades/festivales';
  ELSE
    _subject := 'award'; _cat := 'marketing'; _area := 'produccion'; _badge := 'Premio';
    _name := NEW.nombre_premio; _deadline := NEW.fecha_limite_inscripcion;
    _opening := NEW.fecha_apertura_candidaturas; _gala := NEW.fecha_gala_fallo;
    _composer := NEW.representado_vinculado;
    _link := '/oportunidades/premios';
  END IF;

  DELETE FROM public.calendar_events WHERE subject_id = _id AND source_kind LIKE 'deadline_%';
  DELETE FROM public.actions WHERE subject_id = _id AND kind = 'tarea' AND subarea = 'preaviso_deadline' AND done = false;

  IF _deadline IS NOT NULL THEN
    INSERT INTO public.calendar_events (subject_type, subject_id, kind, calendar_category, start_date, end_date, title, note, source_kind)
    VALUES (_subject, _id, 'deadline', _cat, _deadline, _deadline, 'Plazo ' || lower(_badge) || ' · ' || _name, _link, 'deadline_' || lower(_badge));

    _owner := public.deadline_owner_person(_composer);
    INSERT INTO public.actions (subject_type, subject_id, title, notes, kind, due_date, assignee_person_id, area, subarea)
    VALUES (
      _subject, _id,
      'Deadline en 30 días: ' || _name || ' — ' || to_char(_deadline, 'DD/MM/YYYY'),
      _link, 'tarea', _deadline - 30, _owner, _area, 'preaviso_deadline'
    );
  END IF;

  IF _opening IS NOT NULL THEN
    INSERT INTO public.calendar_events (subject_type, subject_id, kind, calendar_category, start_date, end_date, title, note, source_kind)
    VALUES (_subject, _id, 'apertura', _cat, _opening, _opening, 'Apertura candidaturas · ' || _name, _link, 'deadline_opening');
  END IF;

  IF _start IS NOT NULL THEN
    INSERT INTO public.calendar_events (subject_type, subject_id, kind, calendar_category, start_date, end_date, title, note, source_kind)
    VALUES (_subject, _id, 'festival_inicio', _cat, _start, _start, 'Inicio festival · ' || _name, _link, 'deadline_festival_start');
  END IF;

  IF _end IS NOT NULL THEN
    INSERT INTO public.calendar_events (subject_type, subject_id, kind, calendar_category, start_date, end_date, title, note, source_kind)
    VALUES (_subject, _id, 'festival_fin', _cat, _end, _end, 'Fin festival · ' || _name, _link, 'deadline_festival_end');
  END IF;

  IF _gala IS NOT NULL THEN
    INSERT INTO public.calendar_events (subject_type, subject_id, kind, calendar_category, start_date, end_date, title, note, source_kind)
    VALUES (_subject, _id, 'gala', _cat, _gala, _gala, 'Gala/fallo · ' || _name, _link, 'deadline_gala');
  END IF;

  RETURN NEW;
END $$;

REVOKE EXECUTE ON FUNCTION public.sync_deadline_opportunity() FROM anon, authenticated;