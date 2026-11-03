CREATE OR REPLACE FUNCTION public.sync_production_fee_to_sale_line() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _sum numeric; _diff numeric;
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
  IF NEW.fee_amount IS DISTINCT FROM OLD.fee_amount THEN
    SELECT COALESCE(SUM(amount_initial),0) INTO _sum FROM public.production_finance_lines WHERE production_id = NEW.id AND kind = 'ingreso';
    _diff := COALESCE(NEW.fee_amount,0) - _sum;
    IF _diff <> 0 THEN
      INSERT INTO public.production_finance_lines(production_id, composer_id, kind, concept, amount_initial, amount_final, is_sale_price, counterparty_name)
      VALUES (NEW.id, NEW.composer_id, 'ingreso',
        CASE WHEN _sum = 0 THEN 'Fee composición' ELSE 'Ajuste precio de venta' END,
        _diff, _diff, false,
        (SELECT name FROM public.production_companies WHERE id = NEW.partner_company_id));
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.sync_sale_line_to_production() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _pid uuid; _sum numeric;
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN COALESCE(NEW, OLD); END IF;
  _pid := COALESCE(NEW.production_id, OLD.production_id);
  SELECT SUM(amount_initial) INTO _sum FROM public.production_finance_lines WHERE production_id = _pid AND kind = 'ingreso';
  UPDATE public.productions SET fee_amount = _sum WHERE id = _pid AND fee_amount IS DISTINCT FROM _sum;
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS production_finance_lines_sale_sync ON public.production_finance_lines;
CREATE TRIGGER production_finance_lines_sale_sync AFTER INSERT OR UPDATE OF amount_initial, kind, production_id OR DELETE ON public.production_finance_lines FOR EACH ROW EXECUTE FUNCTION public.sync_sale_line_to_production();