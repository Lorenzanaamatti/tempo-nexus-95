
CREATE TABLE public.brand_asset_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.brand_assets(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  filename text,
  notes text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX brand_asset_files_asset_id_idx ON public.brand_asset_files(asset_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_asset_files TO authenticated;
GRANT ALL ON public.brand_asset_files TO service_role;
ALTER TABLE public.brand_asset_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brand_asset_files read" ON public.brand_asset_files
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "brand_asset_files admin write" ON public.brand_asset_files
  FOR ALL TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

-- Backfill existing single storage_path into new child table
INSERT INTO public.brand_asset_files (asset_id, storage_path, position)
SELECT id, storage_path, 0 FROM public.brand_assets WHERE storage_path IS NOT NULL AND storage_path <> '';
