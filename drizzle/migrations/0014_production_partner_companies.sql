-- Varias productoras por producción: tabla de vínculo producción ↔ productora.
-- Aditiva: no se toca ni se borra nada existente; productions.partner_company_id sigue siendo la productora principal.
CREATE TABLE public.production_partner_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_id uuid NOT NULL REFERENCES public.productions(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.production_companies(id) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT production_partner_companies_unique UNIQUE (production_id, company_id)
);

CREATE INDEX production_partner_companies_company_idx ON public.production_partner_companies (company_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_partner_companies TO authenticated;
GRANT ALL ON public.production_partner_companies TO service_role;

ALTER TABLE public.production_partner_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "production partner companies staff read" ON public.production_partner_companies
  FOR SELECT TO authenticated
  USING (
    public.current_user_is_staff()
    OR EXISTS (
      SELECT 1 FROM public.productions p
      WHERE p.id = production_partner_companies.production_id
        AND p.composer_id IS NOT NULL
        AND public.can_access_composer(p.composer_id)
    )
  );

CREATE POLICY "production partner companies staff write" ON public.production_partner_companies
  FOR ALL TO authenticated
  USING (public.current_user_is_staff())
  WITH CHECK (public.current_user_is_staff());

-- Backfill: la productora principal ya registrada pasa a la tabla de vínculo.
INSERT INTO public.production_partner_companies (production_id, company_id, is_primary)
SELECT id, partner_company_id, true
FROM public.productions
WHERE partner_company_id IS NOT NULL
ON CONFLICT (production_id, company_id) DO NOTHING;