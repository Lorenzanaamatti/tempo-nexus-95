CREATE OR REPLACE FUNCTION public.sync_action_calendar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _cat public.calendar_category;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.calendar_events WHERE source_action_id = OLD.id;
    RETURN OLD;
  END IF;

  DELETE FROM public.calendar_events WHERE source_action_id = NEW.id;

  IF NEW.due_date IS NULL OR NEW.done THEN
    RETURN NEW;
  END IF;

  -- Skip calendar sync for standalone tasks (no subject attached)
  IF NEW.subject_type IS NULL OR NEW.subject_id IS NULL THEN
    RETURN NEW;
  END IF;

  _cat := CASE WHEN NEW.assignee_person_id IS NOT NULL THEN 'personal'::public.calendar_category
               ELSE 'operativo'::public.calendar_category END;

  INSERT INTO public.calendar_events (
    subject_type, subject_id, kind, calendar_category,
    start_date, end_date, title, note,
    assignee_person_id, source_action_id, source_kind
  ) VALUES (
    NEW.subject_type, NEW.subject_id, 'tarea', _cat,
    NEW.due_date, NEW.due_date, NEW.title, NEW.notes,
    NEW.assignee_person_id, NEW.id, 'action'
  );
  RETURN NEW;
END $function$;