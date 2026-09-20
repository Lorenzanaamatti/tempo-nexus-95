ALTER TABLE public.production_billing_sprints
  ADD COLUMN IF NOT EXISTS contract_id uuid REFERENCES public.contracts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS client_name text,
  ADD COLUMN IF NOT EXISTS concept text,
  ADD COLUMN IF NOT EXISTS representative_amount numeric,
  ADD COLUMN IF NOT EXISTS commission_pct numeric,
  ADD COLUMN IF NOT EXISTS representative_due_date date,
  ADD COLUMN IF NOT EXISTS planned_invoice_date date,
  ADD COLUMN IF NOT EXISTS is_manual boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS manual_fields text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS source_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_edited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_edited_at timestamptz;

CREATE TYPE public.billing_order_status AS ENUM ('borrador','enviada','facturada','anulada');

CREATE TABLE public.billing_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  status public.billing_order_status NOT NULL DEFAULT 'borrador',
  subject text NOT NULL,
  notes text,
  total_amount numeric NOT NULL DEFAULT 0,
  recipient_emails text[] NOT NULL DEFAULT '{}'::text[],
  created_by uuid NOT NULL REFERENCES auth.users(id),
  sent_by uuid REFERENCES auth.users(id),
  sent_at timestamptz,
  invoiced_at timestamptz,
  cancelled_at timestamptz,
  email_idempotency_key text UNIQUE,
  email_result jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_orders TO authenticated;
GRANT ALL ON public.billing_orders TO service_role;
ALTER TABLE public.billing_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "billing_orders admin read" ON public.billing_orders FOR SELECT TO authenticated USING (public.current_user_is_admin());
CREATE POLICY "billing_orders admin write" ON public.billing_orders FOR ALL TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
CREATE TRIGGER trg_billing_orders_updated BEFORE UPDATE ON public.billing_orders FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.billing_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.billing_orders(id) ON DELETE CASCADE,
  sprint_id uuid REFERENCES public.production_billing_sprints(id) ON DELETE SET NULL,
  production_id uuid REFERENCES public.productions(id) ON DELETE SET NULL,
  contract_id uuid REFERENCES public.contracts(id) ON DELETE SET NULL,
  production_title text,
  client_name text,
  representative_name text,
  concept text NOT NULL,
  representative_amount numeric,
  commission_pct numeric,
  commission_amount numeric NOT NULL,
  representative_due_date date,
  planned_invoice_date date,
  invoice_reference text,
  notes text,
  position integer NOT NULL DEFAULT 0,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_order_items TO authenticated;
GRANT ALL ON public.billing_order_items TO service_role;
ALTER TABLE public.billing_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "billing_order_items admin read" ON public.billing_order_items FOR SELECT TO authenticated USING (public.current_user_is_admin());
CREATE POLICY "billing_order_items admin write" ON public.billing_order_items FOR ALL TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

CREATE TABLE public.billing_order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.billing_orders(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('creada','editada','enviada','facturada','anulada','error_envio')),
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_order_events TO authenticated;
GRANT ALL ON public.billing_order_events TO service_role;
ALTER TABLE public.billing_order_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "billing_order_events admin read" ON public.billing_order_events FOR SELECT TO authenticated USING (public.current_user_is_admin());
CREATE POLICY "billing_order_events admin write" ON public.billing_order_events FOR ALL TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

CREATE OR REPLACE FUNCTION public.next_billing_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefix text := to_char(current_date, 'DDMMYYYY') || '-';
  next_value integer;
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT coalesce(max(nullif(split_part(order_number, '-', 2), '')::integer), 0) + 1
    INTO next_value
    FROM public.billing_orders
   WHERE order_number LIKE prefix || '%';
  RETURN prefix || next_value::text;
END;
$$;
REVOKE ALL ON FUNCTION public.next_billing_order_number() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.next_billing_order_number() TO authenticated, service_role;

CREATE INDEX billing_orders_status_idx ON public.billing_orders(status, created_at DESC);
CREATE INDEX billing_order_items_order_idx ON public.billing_order_items(order_id, position);
CREATE INDEX billing_order_events_order_idx ON public.billing_order_events(order_id, created_at DESC);