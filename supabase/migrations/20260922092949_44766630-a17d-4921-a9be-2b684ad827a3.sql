DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='billing_invoice_status') THEN
    CREATE TYPE public.billing_invoice_status AS ENUM ('emitida','cobrada','anulada');
  END IF;
END $$;

CREATE TABLE public.billing_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text,
  issue_date date NOT NULL DEFAULT current_date,
  period_year integer,
  period_month integer,
  production_id uuid REFERENCES public.productions(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.billing_orders(id) ON DELETE SET NULL,
  order_item_id uuid REFERENCES public.billing_order_items(id) ON DELETE SET NULL,
  sprint_id uuid REFERENCES public.production_billing_sprints(id) ON DELETE SET NULL,
  production_title text,
  client_name text,
  representative_name text,
  concept text,
  amount numeric NOT NULL DEFAULT 0,
  status public.billing_invoice_status NOT NULL DEFAULT 'emitida',
  due_date date,
  paid_date date,
  pdf_path text,
  notes text,
  created_by uuid,
  last_edited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX billing_invoices_number_key ON public.billing_invoices (invoice_number) WHERE invoice_number IS NOT NULL;
CREATE UNIQUE INDEX billing_invoices_order_item_key ON public.billing_invoices (order_item_id) WHERE order_item_id IS NOT NULL;
CREATE INDEX billing_invoices_production_idx ON public.billing_invoices (production_id);
CREATE INDEX billing_invoices_issue_idx ON public.billing_invoices (issue_date);
CREATE INDEX billing_invoices_status_idx ON public.billing_invoices (status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_invoices TO authenticated;
GRANT ALL ON public.billing_invoices TO service_role;

ALTER TABLE public.billing_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff puede ver facturas" ON public.billing_invoices
  FOR SELECT TO authenticated USING (public.current_user_is_staff());
CREATE POLICY "BIG C gestiona facturas" ON public.billing_invoices
  FOR ALL TO authenticated USING (public.current_user_is_big_c()) WITH CHECK (public.current_user_is_big_c());

CREATE OR REPLACE FUNCTION public.billing_invoices_set_period()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.period_year := EXTRACT(YEAR FROM NEW.issue_date)::int;
  NEW.period_month := EXTRACT(MONTH FROM NEW.issue_date)::int;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

CREATE TRIGGER billing_invoices_period
BEFORE INSERT OR UPDATE ON public.billing_invoices
FOR EACH ROW EXECUTE FUNCTION public.billing_invoices_set_period();

CREATE POLICY "Staff lee facturas pdf" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'billing-invoices' AND public.current_user_is_staff());
CREATE POLICY "BIG C sube facturas pdf" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'billing-invoices' AND public.current_user_is_big_c());
CREATE POLICY "BIG C actualiza facturas pdf" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'billing-invoices' AND public.current_user_is_big_c());
CREATE POLICY "BIG C borra facturas pdf" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'billing-invoices' AND public.current_user_is_big_c());