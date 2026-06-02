
-- ============================================
-- MARKETING & SALES — FASE 1 (Repositorios documentales)
-- ============================================

-- Enums comunes
CREATE TYPE public.marketing_language AS ENUM ('es', 'en', 'ca', 'fr', 'pt', 'other');
CREATE TYPE public.deck_purpose AS ENUM ('corto', 'largo', 'generico', 'por_cliente', 'sector');
CREATE TYPE public.outreach_template_kind AS ENUM ('cold', 'follow_up', 'propuesta_economica', 'nda', 'agradecimiento', 'otro');
CREATE TYPE public.press_kit_scope AS ENUM ('ic_global', 'compositor');
CREATE TYPE public.case_study_visibility AS ENUM ('interna', 'externa');

-- ============================================
-- 1) marketing_decks
-- ============================================
CREATE TABLE public.marketing_decks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  purpose deck_purpose NOT NULL DEFAULT 'generico',
  audience text,
  language marketing_language NOT NULL DEFAULT 'es',
  version text,
  storage_path text,
  external_url text,
  public_link text,
  notes text,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_decks TO authenticated;
GRANT ALL ON public.marketing_decks TO service_role;

ALTER TABLE public.marketing_decks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "marketing_decks read" ON public.marketing_decks
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "marketing_decks admin write" ON public.marketing_decks
  FOR ALL TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

CREATE TRIGGER trg_marketing_decks_updated_at
  BEFORE UPDATE ON public.marketing_decks
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================
-- 2) press_clippings
-- ============================================
CREATE TABLE public.press_clippings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet text NOT NULL,
  headline text NOT NULL,
  author text,
  published_date date,
  language marketing_language NOT NULL DEFAULT 'es',
  url text,
  screenshot_path text,
  composer_id uuid REFERENCES public.composers(id) ON DELETE SET NULL,
  tags text[] NOT NULL DEFAULT '{}',
  featured boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.press_clippings TO authenticated;
GRANT ALL ON public.press_clippings TO service_role;

ALTER TABLE public.press_clippings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "press_clippings read" ON public.press_clippings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "press_clippings admin write" ON public.press_clippings
  FOR ALL TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

CREATE TRIGGER trg_press_clippings_updated_at
  BEFORE UPDATE ON public.press_clippings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_press_clippings_composer ON public.press_clippings(composer_id);
CREATE INDEX idx_press_clippings_date ON public.press_clippings(published_date DESC);

-- ============================================
-- 3) brand_guidelines (secciones del libro de estilo)
-- ============================================
CREATE TABLE public.brand_guidelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section text NOT NULL,
  body_md text,
  position integer NOT NULL DEFAULT 0,
  version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_guidelines TO authenticated;
GRANT ALL ON public.brand_guidelines TO service_role;

ALTER TABLE public.brand_guidelines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brand_guidelines read" ON public.brand_guidelines
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "brand_guidelines admin write" ON public.brand_guidelines
  FOR ALL TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

CREATE TRIGGER trg_brand_guidelines_updated_at
  BEFORE UPDATE ON public.brand_guidelines
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Assets descargables del brand (logos, tipografías, etc.)
CREATE TABLE public.brand_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  kind text,
  storage_path text,
  external_url text,
  notes text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_assets TO authenticated;
GRANT ALL ON public.brand_assets TO service_role;

ALTER TABLE public.brand_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brand_assets read" ON public.brand_assets
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "brand_assets admin write" ON public.brand_assets
  FOR ALL TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

-- ============================================
-- 4) case_studies
-- ============================================
CREATE TABLE public.case_studies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  client text,
  composer_id uuid REFERENCES public.composers(id) ON DELETE SET NULL,
  year integer,
  problem text,
  proposal text,
  outcome text,
  metrics text,
  visibility case_study_visibility NOT NULL DEFAULT 'interna',
  cover_path text,
  external_url text,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_studies TO authenticated;
GRANT ALL ON public.case_studies TO service_role;

ALTER TABLE public.case_studies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "case_studies read" ON public.case_studies
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "case_studies admin write" ON public.case_studies
  FOR ALL TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

CREATE TRIGGER trg_case_studies_updated_at
  BEFORE UPDATE ON public.case_studies
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_case_studies_composer ON public.case_studies(composer_id);

-- ============================================
-- 5) outreach_templates
-- ============================================
CREATE TABLE public.outreach_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  kind outreach_template_kind NOT NULL DEFAULT 'cold',
  language marketing_language NOT NULL DEFAULT 'es',
  subject text,
  body_md text,
  variables text[] NOT NULL DEFAULT '{}',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.outreach_templates TO authenticated;
GRANT ALL ON public.outreach_templates TO service_role;

ALTER TABLE public.outreach_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "outreach_templates read" ON public.outreach_templates
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "outreach_templates admin write" ON public.outreach_templates
  FOR ALL TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

CREATE TRIGGER trg_outreach_templates_updated_at
  BEFORE UPDATE ON public.outreach_templates
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================
-- 6) press_kits
-- ============================================
CREATE TABLE public.press_kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  scope press_kit_scope NOT NULL DEFAULT 'ic_global',
  composer_id uuid REFERENCES public.composers(id) ON DELETE SET NULL,
  language marketing_language NOT NULL DEFAULT 'es',
  version text,
  storage_path text,
  external_url text,
  public_link text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.press_kits TO authenticated;
GRANT ALL ON public.press_kits TO service_role;

ALTER TABLE public.press_kits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "press_kits read" ON public.press_kits
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "press_kits admin write" ON public.press_kits
  FOR ALL TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

CREATE TRIGGER trg_press_kits_updated_at
  BEFORE UPDATE ON public.press_kits
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_press_kits_composer ON public.press_kits(composer_id);

-- ============================================
-- Storage policies on bucket 'marketing-assets' (private)
-- ============================================
CREATE POLICY "marketing-assets read authenticated"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'marketing-assets');

CREATE POLICY "marketing-assets admin write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'marketing-assets' AND public.current_user_is_admin());

CREATE POLICY "marketing-assets admin update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'marketing-assets' AND public.current_user_is_admin());

CREATE POLICY "marketing-assets admin delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'marketing-assets' AND public.current_user_is_admin());
