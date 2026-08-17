ALTER TABLE public.producciones_espanolas DROP CONSTRAINT IF EXISTS producciones_espanolas_tmdb_id_key;
DROP INDEX IF EXISTS public.producciones_espanolas_tmdb_id_key;
UPDATE public.producciones_espanolas SET media_type = 'movie' WHERE media_type IS NULL OR media_type = '';
CREATE UNIQUE INDEX IF NOT EXISTS producciones_espanolas_tmdb_media_key ON public.producciones_espanolas (tmdb_id, media_type) WHERE tmdb_id IS NOT NULL;