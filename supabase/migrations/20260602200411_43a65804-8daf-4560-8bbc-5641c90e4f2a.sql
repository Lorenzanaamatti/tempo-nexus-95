ALTER TABLE public.production_billing_sprints
  ADD COLUMN IF NOT EXISTS holded_invoice_ref text,
  ADD COLUMN IF NOT EXISTS holded_url text;