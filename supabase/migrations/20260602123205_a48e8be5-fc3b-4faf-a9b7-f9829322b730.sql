-- 1) Add billing milestone kinds to availability_kind enum
ALTER TYPE availability_kind ADD VALUE IF NOT EXISTS 'facturacion';
ALTER TYPE availability_kind ADD VALUE IF NOT EXISTS 'pago';
ALTER TYPE availability_kind ADD VALUE IF NOT EXISTS 'cobro';

-- 2) Track provenance on calendar_events so sprint-generated events can be re-synced safely
ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS source_sprint_id uuid;

CREATE INDEX IF NOT EXISTS calendar_events_source_sprint_idx
  ON public.calendar_events(source_sprint_id);

-- 3) Sync function: for each billing sprint, ensure 1-3 calendar events
--    (vencimiento factura, fecha facturado, fecha cobrado) on the IC general calendar
CREATE OR REPLACE FUNCTION public.sync_billing_sprint_calendar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _prod_title text;
  _kind_label text;
  _amount_label text;
BEGIN
  -- DELETE: just remove the generated events
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.calendar_events WHERE source_sprint_id = OLD.id;
    RETURN OLD;
  END IF;

  -- Pull production title to compose event titles
  SELECT title INTO _prod_title FROM public.productions WHERE id = NEW.production_id;

  _kind_label := CASE NEW.kind WHEN 'trabajo' THEN 'Trabajo' WHEN 'comision' THEN 'Comisión IC' ELSE NEW.kind::text END;
  _amount_label := CASE WHEN NEW.amount IS NOT NULL THEN ' · ' || to_char(NEW.amount, 'FM999G999G990D00') || ' €' ELSE '' END;

  -- Wipe previous events for this sprint, then recreate based on filled dates
  DELETE FROM public.calendar_events WHERE source_sprint_id = NEW.id;

  -- Vencimiento de facturación (factura prevista)
  IF NEW.due_date IS NOT NULL THEN
    INSERT INTO public.calendar_events (
      subject_type, subject_id, kind, start_date, end_date, title, note, source_sprint_id
    ) VALUES (
      'production', NEW.production_id, 'facturacion',
      NEW.due_date, NEW.due_date,
      'Vencimiento factura · ' || _kind_label || ' sprint ' || NEW.sprint_number || _amount_label,
      coalesce(NEW.label, _prod_title), NEW.id
    );
  END IF;

  -- Facturado
  IF NEW.invoiced_date IS NOT NULL THEN
    INSERT INTO public.calendar_events (
      subject_type, subject_id, kind, start_date, end_date, title, note, source_sprint_id
    ) VALUES (
      'production', NEW.production_id, 'pago',
      NEW.invoiced_date, NEW.invoiced_date,
      'Facturado · ' || _kind_label || ' sprint ' || NEW.sprint_number || _amount_label,
      coalesce(NEW.label, _prod_title), NEW.id
    );
  END IF;

  -- Cobrado
  IF NEW.paid_date IS NOT NULL THEN
    INSERT INTO public.calendar_events (
      subject_type, subject_id, kind, start_date, end_date, title, note, source_sprint_id
    ) VALUES (
      'production', NEW.production_id, 'cobro',
      NEW.paid_date, NEW.paid_date,
      'Cobrado · ' || _kind_label || ' sprint ' || NEW.sprint_number || _amount_label,
      coalesce(NEW.label, _prod_title), NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 4) Trigger
DROP TRIGGER IF EXISTS trg_sync_billing_sprint_calendar ON public.production_billing_sprints;
CREATE TRIGGER trg_sync_billing_sprint_calendar
AFTER INSERT OR UPDATE OR DELETE ON public.production_billing_sprints
FOR EACH ROW EXECUTE FUNCTION public.sync_billing_sprint_calendar();

-- 5) Backfill: regenerate calendar events for existing sprints
DELETE FROM public.calendar_events WHERE source_sprint_id IS NOT NULL;
UPDATE public.production_billing_sprints SET updated_at = now();
