ALTER TABLE public.productions
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS original_language text,
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS actual_delivery_date date,
  ADD COLUMN IF NOT EXISTS is_historical boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE SET NULL;

ALTER TABLE public.actions
  ADD COLUMN IF NOT EXISTS production_id uuid REFERENCES public.productions(id) ON DELETE SET NULL;

ALTER TABLE public.deal_memos
  ADD COLUMN IF NOT EXISTS production_id uuid REFERENCES public.productions(id) ON DELETE SET NULL;

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS production_id uuid REFERENCES public.productions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_actions_production ON public.actions(production_id);
CREATE INDEX IF NOT EXISTS idx_deal_memos_production ON public.deal_memos(production_id);
CREATE INDEX IF NOT EXISTS idx_contracts_production ON public.contracts(production_id);
CREATE INDEX IF NOT EXISTS idx_productions_source_opportunity ON public.productions(source_opportunity_id);

CREATE OR REPLACE FUNCTION public.productions_set_actual_delivery()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('finalizada','estrenada','comunicado_estreno') AND NEW.actual_delivery_date IS NULL THEN
    NEW.actual_delivery_date := COALESCE(NEW.premiere_date, NEW.delivery_date, CURRENT_DATE);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_productions_set_actual_delivery ON public.productions;
CREATE TRIGGER trg_productions_set_actual_delivery
BEFORE INSERT OR UPDATE ON public.productions
FOR EACH ROW EXECUTE FUNCTION public.productions_set_actual_delivery();