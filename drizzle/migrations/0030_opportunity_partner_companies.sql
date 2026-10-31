CREATE TABLE public.opportunity_partner_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.production_companies(id) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (opportunity_id, company_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunity_partner_companies TO authenticated;
GRANT ALL ON public.opportunity_partner_companies TO service_role;
ALTER TABLE public.opportunity_partner_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "opp partner companies staff read" ON public.opportunity_partner_companies FOR SELECT TO authenticated USING (public.current_user_is_staff());
CREATE POLICY "opp partner companies staff write" ON public.opportunity_partner_companies FOR ALL TO authenticated USING (public.current_user_is_staff()) WITH CHECK (public.current_user_is_staff());
CREATE INDEX ON public.opportunity_partner_companies(company_id);
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS kept_at timestamptz;
ALTER TABLE public.production_companies ADD COLUMN IF NOT EXISTS deprecated_at timestamptz;
COMMENT ON COLUMN public.production_companies.deprecated_at IS 'Set when a row combined several companies in one name; replaced by individual rows. Hidden from selectors.';
INSERT INTO public.opportunity_partner_companies (opportunity_id, company_id, is_primary)
SELECT id, partner_company_id, true FROM public.opportunities WHERE partner_company_id IS NOT NULL
ON CONFLICT DO NOTHING;