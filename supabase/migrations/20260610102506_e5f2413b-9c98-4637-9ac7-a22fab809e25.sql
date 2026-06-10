-- ============ Business Plan ============
CREATE TYPE public.ic_budget_category AS ENUM (
  'ingreso_comision',
  'ingreso_otros',
  'gasto_personal',
  'gasto_operativo',
  'gasto_marketing',
  'gasto_otros'
);

CREATE TABLE public.ic_budget_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year int NOT NULL,
  month int NOT NULL CHECK (month BETWEEN 1 AND 12),
  category public.ic_budget_category NOT NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (year, month, category)
);

CREATE INDEX ic_budget_lines_year_idx ON public.ic_budget_lines (year);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ic_budget_lines TO authenticated;
GRANT ALL ON public.ic_budget_lines TO service_role;

ALTER TABLE public.ic_budget_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage IC budget"
ON public.ic_budget_lines FOR ALL TO authenticated
USING (public.current_user_is_admin())
WITH CHECK (public.current_user_is_admin());

CREATE TRIGGER ic_budget_lines_touch_updated_at
BEFORE UPDATE ON public.ic_budget_lines
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ IC Expenses (gastos de la compañía, no de producciones) ============
CREATE TABLE public.ic_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date date NOT NULL,
  category public.ic_budget_category NOT NULL DEFAULT 'gasto_operativo',
  concept text NOT NULL,
  provider_id uuid REFERENCES public.providers(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL,
  vat_pct numeric(5,2),
  paid_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ic_expenses_date_idx ON public.ic_expenses (expense_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ic_expenses TO authenticated;
GRANT ALL ON public.ic_expenses TO service_role;

ALTER TABLE public.ic_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage IC expenses"
ON public.ic_expenses FOR ALL TO authenticated
USING (public.current_user_is_admin())
WITH CHECK (public.current_user_is_admin());

CREATE TRIGGER ic_expenses_touch_updated_at
BEFORE UPDATE ON public.ic_expenses
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
