CREATE OR REPLACE FUNCTION public.sync_contract_calendar()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _subj_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.calendar_events WHERE source_contract_id = OLD.id;
    RETURN OLD;
  END IF;

  DELETE FROM public.calendar_events WHERE source_contract_id = NEW.id;
  _subj_id := COALESCE(NEW.composer_id, NEW.signer_composer_id);
  IF _subj_id IS NULL THEN RETURN NEW; END IF;

  IF NEW.signed_date IS NOT NULL THEN
    INSERT INTO public.calendar_events (subject_type, subject_id, kind, calendar_category, start_date, end_date, title, source_contract_id, source_kind)
    VALUES ('composer', _subj_id, 'contrato_firma', 'legal', NEW.signed_date, NEW.signed_date, 'Firma · ' || NEW.title, NEW.id, 'contract_signed');
  END IF;

  IF NEW.notice_date IS NOT NULL THEN
    INSERT INTO public.calendar_events (subject_type, subject_id, kind, calendar_category, start_date, end_date, title, source_contract_id, source_kind)
    VALUES ('composer', _subj_id, 'contrato_preaviso', 'legal', NEW.notice_date, NEW.notice_date, 'Preaviso · ' || NEW.title, NEW.id, 'contract_notice');
  END IF;

  IF NEW.end_date IS NOT NULL THEN
    INSERT INTO public.calendar_events (subject_type, subject_id, kind, calendar_category, start_date, end_date, title, source_contract_id, source_kind)
    VALUES ('composer', _subj_id, 'contrato_fin', 'legal', NEW.end_date, NEW.end_date, 'Fin contrato · ' || NEW.title, NEW.id, 'contract_end');
  END IF;

  RETURN NEW;
END $function$;

UPDATE public.calendar_events
   SET calendar_category = 'legal'
 WHERE source_contract_id IS NOT NULL
   AND source_kind IN ('contract_signed','contract_notice','contract_end');