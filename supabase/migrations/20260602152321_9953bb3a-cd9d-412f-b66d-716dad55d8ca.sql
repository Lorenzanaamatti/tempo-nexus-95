-- 1) Add signer linking to contracts
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS signer_composer_id uuid,
  ADD COLUMN IF NOT EXISTS signer_person_id uuid;

CREATE INDEX IF NOT EXISTS idx_contracts_signer_composer ON public.contracts(signer_composer_id);
CREATE INDEX IF NOT EXISTS idx_contracts_signer_person ON public.contracts(signer_person_id);

-- 2) Multiple counterparties per contract
CREATE TABLE IF NOT EXISTS public.contract_counterparties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  partner_company_id uuid REFERENCES public.production_companies(id) ON DELETE SET NULL,
  person_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  name text,
  role text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cc_contract ON public.contract_counterparties(contract_id);
CREATE INDEX IF NOT EXISTS idx_cc_company ON public.contract_counterparties(partner_company_id);
CREATE INDEX IF NOT EXISTS idx_cc_person ON public.contract_counterparties(person_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_counterparties TO authenticated;
GRANT ALL ON public.contract_counterparties TO service_role;

ALTER TABLE public.contract_counterparties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contract_counterparties read"
  ON public.contract_counterparties FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "contract_counterparties admin write"
  ON public.contract_counterparties FOR ALL
  TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());