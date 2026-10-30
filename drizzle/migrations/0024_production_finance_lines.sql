CREATE TABLE public.production_finance_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_id uuid NOT NULL REFERENCES public.productions(id) ON DELETE CASCADE,
  composer_id uuid REFERENCES public.composers(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('ingreso','gasto')),
  concept text NOT NULL DEFAULT '',
  counterparty_name text,
  counterparty_type text CHECK (counterparty_type IN ('partner','productora','cuenta','manual')),
  counterparty_id uuid,
  amount_initial numeric(14,2),
  amount_final numeric(14,2),
  period date,
  invoice_issued boolean NOT NULL DEFAULT false,
  invoice_settled boolean NOT NULL DEFAULT false,
  is_sale_price boolean NOT NULL DEFAULT false,
  notes text,
  position integer NOT NULL DEFAULT 0,
  legacy_expense_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX production_finance_lines_prod_idx ON public.production_finance_lines(production_id);
CREATE INDEX production_finance_lines_cp_idx ON public.production_finance_lines(counterparty_id);
CREATE UNIQUE INDEX production_finance_lines_sale_uq ON public.production_finance_lines(production_id) WHERE is_sale_price;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_finance_lines TO authenticated;
GRANT ALL ON public.production_finance_lines TO service_role;
ALTER TABLE public.production_finance_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "finance_lines read" ON public.production_finance_lines FOR SELECT TO authenticated
  USING (public.current_user_is_staff() OR EXISTS (SELECT 1 FROM public.productions p WHERE p.id = production_id AND p.composer_id IS NOT NULL AND public.can_access_composer(p.composer_id)));
CREATE POLICY "finance_lines staff write" ON public.production_finance_lines FOR ALL TO authenticated
  USING (public.current_user_is_staff()) WITH CHECK (public.current_user_is_staff());
CREATE TRIGGER production_finance_lines_touch BEFORE UPDATE ON public.production_finance_lines FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.productions
  ADD COLUMN ic_fee_mode text NOT NULL DEFAULT 'pct' CHECK (ic_fee_mode IN ('pct','fijo')),
  ADD COLUMN ic_fee_pct_initial numeric,
  ADD COLUMN ic_fee_fixed_initial numeric(14,2),
  ADD COLUMN ic_fee_fixed_final numeric(14,2),
  ADD COLUMN ic_fee_invoiced boolean NOT NULL DEFAULT false,
  ADD COLUMN ic_fee_paid boolean NOT NULL DEFAULT false;

-- Precio de venta <-> línea «Fee composición» sincronizados
CREATE OR REPLACE FUNCTION public.sync_sale_line_to_production() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
  IF NEW.is_sale_price THEN
    UPDATE public.productions SET fee_amount = NEW.amount_final WHERE id = NEW.production_id AND fee_amount IS DISTINCT FROM NEW.amount_final;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER production_finance_lines_sale_sync AFTER INSERT OR UPDATE OF amount_final, is_sale_price ON public.production_finance_lines FOR EACH ROW EXECUTE FUNCTION public.sync_sale_line_to_production();

CREATE OR REPLACE FUNCTION public.sync_production_fee_to_sale_line() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
  IF NEW.fee_amount IS DISTINCT FROM OLD.fee_amount THEN
    UPDATE public.production_finance_lines SET amount_final = NEW.fee_amount WHERE production_id = NEW.id AND is_sale_price;
    IF NOT FOUND AND NEW.fee_amount IS NOT NULL THEN
      INSERT INTO public.production_finance_lines(production_id, composer_id, kind, concept, amount_initial, amount_final, is_sale_price, counterparty_name)
      VALUES (NEW.id, NEW.composer_id, 'ingreso', 'Fee composición', NEW.fee_amount, NEW.fee_amount, true,
        (SELECT name FROM public.production_companies WHERE id = NEW.partner_company_id));
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER productions_fee_sale_sync AFTER UPDATE OF fee_amount ON public.productions FOR EACH ROW EXECUTE FUNCTION public.sync_production_fee_to_sale_line();

-- Paso de datos: ingresos desde el precio de venta
INSERT INTO public.production_finance_lines(production_id, composer_id, kind, concept, counterparty_name, counterparty_type, counterparty_id, amount_initial, amount_final, is_sale_price)
SELECT p.id, p.composer_id, 'ingreso', 'Fee composición', pc.name, CASE WHEN pc.id IS NULL THEN NULL ELSE 'productora' END, pc.id, p.fee_amount, p.fee_amount, true
FROM public.productions p LEFT JOIN public.production_companies pc ON pc.id = p.partner_company_id
WHERE p.fee_amount IS NOT NULL;

-- Paso de datos: gastos (sin fees de agencia ni de compositora)
INSERT INTO public.production_finance_lines(production_id, composer_id, kind, concept, counterparty_name, counterparty_type, amount_initial, amount_final, period, notes, legacy_expense_id, position)
SELECT e.production_id, e.composer_id, 'gasto', e.concepto, e.provider_name, CASE WHEN e.provider_name IS NULL THEN NULL ELSE 'manual' END,
  COALESCE(e.budget_amount, e.amount), e.amount, e.expense_date, e.description, e.id,
  row_number() OVER (PARTITION BY e.production_id ORDER BY e.created_at)
FROM public.production_expenses e
WHERE e.concepto !~* '^fee (agencia|compositor)';

-- Fees de agencia antiguos -> fila Fee agencia IC
UPDATE public.productions SET ic_fee_mode='pct', ic_commission_pct=20, ic_fee_pct_initial=20, commission_basis=COALESCE(commission_basis,'precio') WHERE id IN ('3165f8ba-e671-4f90-a463-5913a3263fee','e8ada69a-951f-42a4-9747-068023160820');
UPDATE public.productions SET ic_fee_mode='fijo', ic_fee_fixed_initial=1000, ic_fee_fixed_final=1000 WHERE id='3220a489-b627-4936-92ec-1c7f63e06659';
UPDATE public.productions SET ic_fee_mode='fijo', ic_fee_fixed_initial=3000 WHERE id='1ef0ec55-13bb-413d-b15b-b8ee3e22ee2a';
UPDATE public.productions SET ic_fee_pct_initial = ic_commission_pct WHERE ic_fee_pct_initial IS NULL AND ic_commission_pct IS NOT NULL;

COMMENT ON TABLE public.production_expenses IS 'DEPRECATED: replaced by production_finance_lines; kept as backup';