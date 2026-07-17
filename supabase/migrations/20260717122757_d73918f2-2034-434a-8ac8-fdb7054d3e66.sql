CREATE OR REPLACE FUNCTION public.sync_action_calendar()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _cat public.calendar_category;
  _subject_type public.calendar_subject_type;
  _subject_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.calendar_events WHERE source_action_id = OLD.id;
    RETURN OLD;
  END IF;

  DELETE FROM public.calendar_events WHERE source_action_id = NEW.id;

  IF NEW.due_date IS NULL OR NEW.done THEN
    RETURN NEW;
  END IF;

  -- Standalone tasks (no subject) still sync when they have an assignee.
  IF NEW.subject_type IS NOT NULL AND NEW.subject_id IS NOT NULL THEN
    _subject_type := NEW.subject_type;
    _subject_id := NEW.subject_id;
  ELSIF NEW.assignee_person_id IS NOT NULL THEN
    _subject_type := 'person'::public.calendar_subject_type;
    _subject_id := NEW.assignee_person_id;
  ELSE
    RETURN NEW;
  END IF;

  _cat := CASE WHEN NEW.assignee_person_id IS NOT NULL THEN 'personal'::public.calendar_category
               ELSE 'operativo'::public.calendar_category END;

  INSERT INTO public.calendar_events (
    subject_type, subject_id, kind, calendar_category,
    start_date, end_date, title, note,
    assignee_person_id, source_action_id, source_kind
  ) VALUES (
    _subject_type, _subject_id, 'tarea', _cat,
    NEW.due_date, NEW.due_date, NEW.title, NEW.notes,
    NEW.assignee_person_id, NEW.id, 'action'
  );
  RETURN NEW;
END $function$;

-- Reprocess existing standalone tasks so they show up.
UPDATE public.actions SET updated_at = now()
 WHERE done = false
   AND due_date IS NOT NULL
   AND subject_type IS NULL
   AND assignee_person_id IS NOT NULL;