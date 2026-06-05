-- Helper: add N business days (skip Sat & Sun)
CREATE OR REPLACE FUNCTION public.add_business_days(_d date, _n int)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  result date := _d;
  added int := 0;
  step int := CASE WHEN _n >= 0 THEN 1 ELSE -1 END;
  remaining int := abs(_n);
BEGIN
  IF _d IS NULL OR _n = 0 THEN RETURN _d; END IF;
  WHILE added < remaining LOOP
    result := result + step;
    -- isodow: 1..5 = Mon..Fri, 6 = Sat, 7 = Sun
    IF extract(isodow FROM result) < 6 THEN
      added := added + 1;
    END IF;
  END LOOP;
  RETURN result;
END $$;

-- Auto-pair an IC commission sprint for every 'trabajo' sprint
CREATE OR REPLACE FUNCTION public.pair_ic_commission_sprint()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _pct numeric;
  _amount numeric;
  _paid date;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.kind = 'trabajo' THEN
      DELETE FROM public.production_billing_sprints
       WHERE production_id = OLD.production_id
         AND sprint_number = OLD.sprint_number
         AND kind = 'comision';
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.kind <> 'trabajo' THEN
    RETURN NEW;
  END IF;

  SELECT ic_commission_pct INTO _pct FROM public.productions WHERE id = NEW.production_id;
  _amount := CASE
    WHEN NEW.amount IS NOT NULL AND _pct IS NOT NULL THEN round(NEW.amount * _pct / 100.0, 2)
    ELSE NULL
  END;
  _paid := public.add_business_days(NEW.paid_date, 5);

  IF EXISTS (
    SELECT 1 FROM public.production_billing_sprints
     WHERE production_id = NEW.production_id
       AND sprint_number = NEW.sprint_number
       AND kind = 'comision'
  ) THEN
    UPDATE public.production_billing_sprints
       SET label = coalesce(label, 'Comisión IC sprint ' || NEW.sprint_number),
           amount = _amount,
           due_date = NEW.invoiced_date,
           invoiced_date = NEW.invoiced_date,
           paid_date = _paid,
           status = CASE
             WHEN _paid IS NOT NULL THEN 'cobrado'::billing_sprint_status
             WHEN NEW.invoiced_date IS NOT NULL THEN 'facturado'::billing_sprint_status
             ELSE 'pendiente'::billing_sprint_status
           END,
           updated_at = now()
     WHERE production_id = NEW.production_id
       AND sprint_number = NEW.sprint_number
       AND kind = 'comision';
  ELSE
    INSERT INTO public.production_billing_sprints (
      production_id, sprint_number, kind, label, amount,
      due_date, invoiced_date, paid_date, status
    ) VALUES (
      NEW.production_id, NEW.sprint_number, 'comision',
      'Comisión IC sprint ' || NEW.sprint_number,
      _amount,
      NEW.invoiced_date,
      NEW.invoiced_date,
      _paid,
      CASE
        WHEN _paid IS NOT NULL THEN 'cobrado'::billing_sprint_status
        WHEN NEW.invoiced_date IS NOT NULL THEN 'facturado'::billing_sprint_status
        ELSE 'pendiente'::billing_sprint_status
      END
    );
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS pair_ic_commission_sprint_trg ON public.production_billing_sprints;
CREATE TRIGGER pair_ic_commission_sprint_trg
AFTER INSERT OR UPDATE OR DELETE ON public.production_billing_sprints
FOR EACH ROW EXECUTE FUNCTION public.pair_ic_commission_sprint();

-- Backfill: trigger paired comision row for every existing 'trabajo' sprint
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.production_billing_sprints WHERE kind = 'trabajo' LOOP
    UPDATE public.production_billing_sprints SET updated_at = now() WHERE id = r.id;
  END LOOP;
END $$;