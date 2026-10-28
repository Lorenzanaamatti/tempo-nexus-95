ALTER TABLE public.production_expenses ADD COLUMN IF NOT EXISTS budget_amount numeric;
ALTER TABLE public.productions ADD COLUMN IF NOT EXISTS commission_basis text CHECK (commission_basis IN ('precio','margen'));
ALTER TABLE public.composers ADD COLUMN IF NOT EXISTS default_commission_basis text CHECK (default_commission_basis IN ('precio','margen'));
ALTER TABLE public.composers ADD COLUMN IF NOT EXISTS default_commission_pct numeric;

CREATE OR REPLACE FUNCTION public.productions_commission_defaults()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _b text; _p numeric;
BEGIN
  IF NEW.composer_id IS NOT NULL AND (NEW.commission_basis IS NULL OR NEW.ic_commission_pct IS NULL) THEN
    SELECT default_commission_basis, default_commission_pct INTO _b, _p FROM public.composers WHERE id = NEW.composer_id;
    NEW.commission_basis := COALESCE(NEW.commission_basis, _b);
    NEW.ic_commission_pct := COALESCE(NEW.ic_commission_pct, _p);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS productions_commission_defaults_trg ON public.productions;
CREATE TRIGGER productions_commission_defaults_trg BEFORE INSERT ON public.productions
FOR EACH ROW EXECUTE FUNCTION public.productions_commission_defaults();