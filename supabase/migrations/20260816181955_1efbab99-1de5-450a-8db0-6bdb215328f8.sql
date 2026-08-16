ALTER TABLE public.brand_assets
  ADD COLUMN IF NOT EXISTS section text NOT NULL DEFAULT 'identidad',
  ADD COLUMN IF NOT EXISTS category text;

CREATE INDEX IF NOT EXISTS brand_assets_section_category_idx ON public.brand_assets (section, category);