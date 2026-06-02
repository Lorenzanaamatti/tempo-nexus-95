-- Enums
DO $$ BEGIN
  CREATE TYPE public.target_account_status AS ENUM (
    'sin_contacto', 'contactado', 'reunion', 'propuesta_enviada', 'cliente_activo', 'en_pausa', 'descartado'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.target_account_priority AS ENUM ('alta', 'media', 'baja');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Table
CREATE TABLE public.target_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  production_company_id uuid NULL,
  status public.target_account_status NOT NULL DEFAULT 'sin_contacto',
  priority public.target_account_priority NOT NULL DEFAULT 'media',
  responsible_person_id uuid NULL,
  next_step text NULL,
  next_step_date date NULL,
  last_contact_date date NULL,
  decks_sent integer NOT NULL DEFAULT 0,
  sector text NULL,
  website text NULL,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX target_accounts_status_idx ON public.target_accounts(status);
CREATE INDEX target_accounts_next_step_date_idx ON public.target_accounts(next_step_date);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.target_accounts TO authenticated;
GRANT ALL ON public.target_accounts TO service_role;

-- RLS
ALTER TABLE public.target_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "target_accounts read"
  ON public.target_accounts FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "target_accounts admin write"
  ON public.target_accounts FOR ALL
  TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

-- updated_at trigger
CREATE TRIGGER target_accounts_touch_updated_at
  BEFORE UPDATE ON public.target_accounts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();