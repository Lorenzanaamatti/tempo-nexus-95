
CREATE OR REPLACE FUNCTION public.sync_target_account_calendar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.calendar_events
     WHERE source_target_account_id = OLD.id
       AND source_kind = 'target_account_next_step';
    RETURN OLD;
  END IF;

  DELETE FROM public.calendar_events
   WHERE source_target_account_id = NEW.id
     AND source_kind = 'target_account_next_step';

  IF NEW.next_step_date IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.calendar_events (
    subject_type, subject_id, kind, calendar_category,
    start_date, end_date, title, note,
    assignee_person_id, source_target_account_id, source_kind
  ) VALUES (
    'target_account'::public.calendar_subject_type, NEW.id, 'tarea', 'operativo',
    NEW.next_step_date, NEW.next_step_date,
    'Próximo paso · ' || NEW.name,
    NEW.next_step,
    NEW.responsible_person_id, NEW.id, 'target_account_next_step'
  );

  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS trg_sync_target_account_calendar ON public.target_accounts;
CREATE TRIGGER trg_sync_target_account_calendar
AFTER INSERT OR UPDATE OR DELETE ON public.target_accounts
FOR EACH ROW EXECUTE FUNCTION public.sync_target_account_calendar();

-- Backfill existing rows
UPDATE public.target_accounts SET updated_at = now()
 WHERE next_step_date IS NOT NULL;
