-- Add commission percentage column (keep ic_commission as € amount)
ALTER TABLE public.productions
  ADD COLUMN IF NOT EXISTS ic_commission_pct numeric;

-- Billing sprints (for both representado work invoicing and IC commission invoicing)
CREATE TYPE public.billing_sprint_kind AS ENUM ('trabajo', 'comision');
CREATE TYPE public.billing_sprint_status AS ENUM ('pendiente', 'facturado', 'cobrado');

CREATE TABLE public.production_billing_sprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_id uuid NOT NULL REFERENCES public.productions(id) ON DELETE CASCADE,
  kind public.billing_sprint_kind NOT NULL,
  sprint_number int NOT NULL CHECK (sprint_number BETWEEN 1 AND 6),
  label text,
  amount numeric,
  due_date date,
  invoiced_date date,
  paid_date date,
  status public.billing_sprint_status NOT NULL DEFAULT 'pendiente',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_billing_sprints TO authenticated;
GRANT ALL ON public.production_billing_sprints TO service_role;

ALTER TABLE public.production_billing_sprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "billing_sprints read"
  ON public.production_billing_sprints FOR SELECT TO authenticated USING (true);

CREATE POLICY "billing_sprints admin write"
  ON public.production_billing_sprints FOR ALL TO authenticated
  USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

CREATE TRIGGER trg_billing_sprints_updated
  BEFORE UPDATE ON public.production_billing_sprints
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_billing_sprints_production ON public.production_billing_sprints(production_id);