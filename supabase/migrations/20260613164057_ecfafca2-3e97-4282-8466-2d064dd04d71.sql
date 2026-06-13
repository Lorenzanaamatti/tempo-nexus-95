
CREATE OR REPLACE FUNCTION public.sync_billing_sprint_calendar()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _prod_title text;
  _kind_label text;
  _amount_label text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.calendar_events WHERE source_sprint_id = OLD.id;
    RETURN OLD;
  END IF;

  SELECT title INTO _prod_title FROM public.productions WHERE id = NEW.production_id;

  _kind_label := CASE NEW.kind WHEN 'trabajo' THEN 'Trabajo' WHEN 'comision' THEN 'Comisión IC' ELSE NEW.kind::text END;
  _amount_label := CASE WHEN NEW.amount IS NOT NULL THEN ' · ' || to_char(NEW.amount, 'FM999G999G990D00') || ' €' ELSE '' END;

  DELETE FROM public.calendar_events WHERE source_sprint_id = NEW.id;

  IF NEW.due_date IS NOT NULL THEN
    INSERT INTO public.calendar_events (
      subject_type, subject_id, kind, calendar_category, start_date, end_date, title, note, source_sprint_id
    ) VALUES (
      'production', NEW.production_id, 'facturacion', 'facturacion',
      NEW.due_date, NEW.due_date,
      'Vencimiento factura · ' || _kind_label || ' sprint ' || NEW.sprint_number || _amount_label,
      coalesce(NEW.label, _prod_title), NEW.id
    );
  END IF;

  IF NEW.invoiced_date IS NOT NULL THEN
    INSERT INTO public.calendar_events (
      subject_type, subject_id, kind, calendar_category, start_date, end_date, title, note, source_sprint_id
    ) VALUES (
      'production', NEW.production_id, 'pago', 'facturacion',
      NEW.invoiced_date, NEW.invoiced_date,
      'Facturado · ' || _kind_label || ' sprint ' || NEW.sprint_number || _amount_label,
      coalesce(NEW.label, _prod_title), NEW.id
    );
  END IF;

  IF NEW.paid_date IS NOT NULL THEN
    INSERT INTO public.calendar_events (
      subject_type, subject_id, kind, calendar_category, start_date, end_date, title, note, source_sprint_id
    ) VALUES (
      'production', NEW.production_id, 'cobro', 'facturacion',
      NEW.paid_date, NEW.paid_date,
      'Cobrado · ' || _kind_label || ' sprint ' || NEW.sprint_number || _amount_label,
      coalesce(NEW.label, _prod_title), NEW.id
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Backfill existing rows
UPDATE public.calendar_events
   SET calendar_category = 'facturacion'
 WHERE source_sprint_id IS NOT NULL
   AND calendar_category IS DISTINCT FROM 'facturacion';
