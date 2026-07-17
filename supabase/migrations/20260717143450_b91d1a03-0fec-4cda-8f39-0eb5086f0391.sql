CREATE TABLE public.marketing_deck_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deck_id UUID NOT NULL REFERENCES public.marketing_decks(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_marketing_deck_files_deck ON public.marketing_deck_files(deck_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_deck_files TO authenticated;
GRANT ALL ON public.marketing_deck_files TO service_role;
ALTER TABLE public.marketing_deck_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "marketing_deck_files read" ON public.marketing_deck_files
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "marketing_deck_files admin write" ON public.marketing_deck_files
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Migrar el archivo único existente a la nueva tabla
INSERT INTO public.marketing_deck_files (deck_id, storage_path, file_name)
SELECT id, storage_path, split_part(storage_path, '/', -1)
FROM public.marketing_decks
WHERE storage_path IS NOT NULL AND storage_path <> '';