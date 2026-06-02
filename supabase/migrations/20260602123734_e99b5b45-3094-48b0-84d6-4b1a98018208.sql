-- Enums
DO $$ BEGIN
  CREATE TYPE public.contract_sign_status AS ENUM ('borrador','enviado','en_revision','firmado','vencido','cancelado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.contract_language AS ENUM ('ca','es','en');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Table
CREATE TABLE IF NOT EXISTS public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  contract_type text,
  signer_name text,
  counterparty text,
  partner_company_id uuid,
  composer_id uuid,
  signed_date date,
  end_date date,
  notice_date date,
  sign_status public.contract_sign_status NOT NULL DEFAULT 'borrador',
  language public.contract_language NOT NULL DEFAULT 'es',
  url text,
  storage_path text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contracts TO authenticated;
GRANT ALL ON public.contracts TO service_role;

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contracts read" ON public.contracts FOR SELECT TO authenticated USING (true);
CREATE POLICY "contracts admin write" ON public.contracts FOR ALL TO authenticated
  USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

CREATE TRIGGER contracts_touch_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS contracts_signed_date_idx ON public.contracts(signed_date);
CREATE INDEX IF NOT EXISTS contracts_end_date_idx ON public.contracts(end_date);
CREATE INDEX IF NOT EXISTS contracts_sign_status_idx ON public.contracts(sign_status);