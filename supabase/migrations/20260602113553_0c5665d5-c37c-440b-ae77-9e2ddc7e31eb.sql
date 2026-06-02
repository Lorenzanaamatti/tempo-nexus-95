-- Productoras CRM
CREATE TABLE public.production_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_name text,
  email text,
  phone text,
  website text,
  country text,
  city text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_companies TO authenticated;
GRANT ALL ON public.production_companies TO service_role;
ALTER TABLE public.production_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prod_companies read" ON public.production_companies FOR SELECT TO authenticated USING (true);
CREATE POLICY "prod_companies admin write" ON public.production_companies FOR ALL TO authenticated USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());
CREATE TRIGGER prod_companies_touch BEFORE UPDATE ON public.production_companies FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Directores CRM
CREATE TABLE public.directors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text,
  phone text,
  agent text,
  country text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.directors TO authenticated;
GRANT ALL ON public.directors TO service_role;
ALTER TABLE public.directors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "directors read" ON public.directors FOR SELECT TO authenticated USING (true);
CREATE POLICY "directors admin write" ON public.directors FOR ALL TO authenticated USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());
CREATE TRIGGER directors_touch BEFORE UPDATE ON public.directors FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Link productions to CRM entries
ALTER TABLE public.productions
  ADD COLUMN partner_company_id uuid REFERENCES public.production_companies(id) ON DELETE SET NULL,
  ADD COLUMN director_id uuid REFERENCES public.directors(id) ON DELETE SET NULL;

CREATE INDEX idx_productions_partner_company_id ON public.productions(partner_company_id);
CREATE INDEX idx_productions_director_id ON public.productions(director_id);