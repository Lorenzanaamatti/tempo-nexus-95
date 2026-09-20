ALTER TABLE public.marketing_decks
  ADD COLUMN IF NOT EXISTS format text NOT NULL DEFAULT 'pptx' CHECK (format IN ('pptx','docx','pdf','mixed')),
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  ADD COLUMN IF NOT EXISTS version_number integer NOT NULL DEFAULT 1 CHECK (version_number > 0),
  ADD COLUMN IF NOT EXISTS parent_deck_id uuid REFERENCES public.marketing_decks(id) ON DELETE SET NULL;

ALTER TABLE public.marketing_deck_files
  ADD COLUMN IF NOT EXISTS mime_type text,
  ADD COLUMN IF NOT EXISTS size_bytes bigint CHECK (size_bytes IS NULL OR size_bytes >= 0),
  ADD COLUMN IF NOT EXISTS page_count integer CHECK (page_count IS NULL OR page_count >= 0),
  ADD COLUMN IF NOT EXISTS preview_manifest jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE public.sales_document_compositions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  purpose public.deck_purpose NOT NULL DEFAULT 'generico',
  language public.marketing_language NOT NULL DEFAULT 'es',
  tags text[] NOT NULL DEFAULT '{}',
  notes text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','generating','ready','failed','archived')),
  created_by uuid,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_document_compositions TO authenticated;
GRANT ALL ON public.sales_document_compositions TO service_role;
ALTER TABLE public.sales_document_compositions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sales_document_compositions read" ON public.sales_document_compositions FOR SELECT TO authenticated USING (true);
CREATE POLICY "sales_document_compositions admin write" ON public.sales_document_compositions FOR ALL TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
CREATE TRIGGER trg_sales_document_compositions_updated BEFORE UPDATE ON public.sales_document_compositions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.sales_document_composition_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  composition_id uuid NOT NULL REFERENCES public.sales_document_compositions(id) ON DELETE CASCADE,
  source_deck_id uuid REFERENCES public.marketing_decks(id) ON DELETE SET NULL,
  source_file_id uuid REFERENCES public.marketing_deck_files(id) ON DELETE SET NULL,
  source_file_name text NOT NULL,
  source_storage_path text NOT NULL,
  source_format text NOT NULL CHECK (source_format IN ('pptx','docx','pdf')),
  selection_kind text NOT NULL DEFAULT 'whole' CHECK (selection_kind IN ('whole','slides','pages','sections')),
  selected_parts integer[] NOT NULL DEFAULT '{}',
  position integer NOT NULL DEFAULT 0,
  editability text NOT NULL DEFAULT 'editable' CHECK (editability IN ('editable','flattened')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_document_composition_items TO authenticated;
GRANT ALL ON public.sales_document_composition_items TO service_role;
ALTER TABLE public.sales_document_composition_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sales_document_composition_items read" ON public.sales_document_composition_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "sales_document_composition_items admin write" ON public.sales_document_composition_items FOR ALL TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
CREATE INDEX sales_document_composition_items_composition_idx ON public.sales_document_composition_items(composition_id, position);

CREATE TABLE public.sales_document_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  composition_id uuid NOT NULL REFERENCES public.sales_document_compositions(id) ON DELETE CASCADE,
  format text NOT NULL CHECK (format IN ('pptx','docx','pdf')),
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  size_bytes bigint CHECK (size_bytes IS NULL OR size_bytes >= 0),
  generated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_document_outputs TO authenticated;
GRANT ALL ON public.sales_document_outputs TO service_role;
ALTER TABLE public.sales_document_outputs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sales_document_outputs read" ON public.sales_document_outputs FOR SELECT TO authenticated USING (true);
CREATE POLICY "sales_document_outputs admin write" ON public.sales_document_outputs FOR ALL TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
CREATE INDEX sales_document_outputs_composition_idx ON public.sales_document_outputs(composition_id, created_at DESC);