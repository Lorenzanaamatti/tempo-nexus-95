CREATE TABLE public.billing_manual_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concept text NOT NULL,
  client_name text,
  representative_name text,
  representative_amount numeric,
  commission_pct numeric,
  commission_amount numeric,
  representative_due_date date,
  planned_invoice_date date,
  status public.billing_sprint_status NOT NULL DEFAULT 'pendiente',
  invoiced_date date,
  paid_date date,
  invoice_reference text,
  invoice_url text,
  notes text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  last_edited_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_manual_lines TO authenticated;
GRANT ALL ON public.billing_manual_lines TO service_role;
ALTER TABLE public.billing_manual_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "billing_manual_lines admin read" ON public.billing_manual_lines FOR SELECT TO authenticated USING (public.current_user_is_admin());
CREATE POLICY "billing_manual_lines admin write" ON public.billing_manual_lines FOR ALL TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
CREATE TRIGGER trg_billing_manual_lines_updated BEFORE UPDATE ON public.billing_manual_lines FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

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
  _existing_manual boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.kind = 'trabajo' THEN
      DELETE FROM public.production_billing_sprints
       WHERE production_id = OLD.production_id
         AND sprint_number = OLD.sprint_number
         AND kind = 'comision'
         AND is_manual = false;
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.kind <> 'trabajo' THEN RETURN NEW; END IF;

  SELECT ic_commission_pct INTO _pct FROM public.productions WHERE id = NEW.production_id;
  _amount := CASE WHEN NEW.amount IS NOT NULL AND _pct IS NOT NULL THEN round(NEW.amount * _pct / 100.0, 2) ELSE NULL END;
  _paid := public.add_business_days(NEW.paid_date, 5);

  SELECT is_manual INTO _existing_manual
  FROM public.production_billing_sprints
  WHERE production_id = NEW.production_id AND sprint_number = NEW.sprint_number AND kind = 'comision';

  IF _existing_manual IS TRUE THEN
    UPDATE public.production_billing_sprints
       SET source_snapshot = jsonb_build_object('fee_amount', NEW.amount, 'ic_commission_pct', _pct), updated_at = now()
     WHERE production_id = NEW.production_id AND sprint_number = NEW.sprint_number AND kind = 'comision';
  ELSIF _existing_manual IS FALSE THEN
    UPDATE public.production_billing_sprints
       SET label = coalesce(label, 'Comisión IC sprint ' || NEW.sprint_number),
           representative_amount = NEW.amount,
           commission_pct = _pct,
           amount = _amount,
           representative_due_date = NEW.due_date,
           planned_invoice_date = NEW.invoiced_date,
           due_date = NEW.invoiced_date,
           paid_date = _paid,
           status = CASE WHEN _paid IS NOT NULL THEN 'cobrado'::billing_sprint_status WHEN NEW.invoiced_date IS NOT NULL THEN 'facturado'::billing_sprint_status ELSE 'pendiente'::billing_sprint_status END,
           source_snapshot = jsonb_build_object('fee_amount', NEW.amount, 'ic_commission_pct', _pct), updated_at = now()
     WHERE production_id = NEW.production_id AND sprint_number = NEW.sprint_number AND kind = 'comision';
  ELSE
    INSERT INTO public.production_billing_sprints (production_id,sprint_number,kind,label,representative_amount,commission_pct,amount,representative_due_date,planned_invoice_date,due_date,paid_date,status,source_snapshot)
    VALUES (NEW.production_id,NEW.sprint_number,'comision','Comisión IC sprint '||NEW.sprint_number,NEW.amount,_pct,_amount,NEW.due_date,NEW.invoiced_date,NEW.invoiced_date,_paid,CASE WHEN _paid IS NOT NULL THEN 'cobrado'::billing_sprint_status WHEN NEW.invoiced_date IS NOT NULL THEN 'facturado'::billing_sprint_status ELSE 'pendiente'::billing_sprint_status END,jsonb_build_object('fee_amount',NEW.amount,'ic_commission_pct',_pct));
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.pair_ic_commission_sprint() FROM PUBLIC, anon, authenticated;