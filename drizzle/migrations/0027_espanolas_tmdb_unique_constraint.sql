DROP INDEX IF EXISTS public.producciones_espanolas_tmdb_media_key;
ALTER TABLE public.producciones_espanolas ADD CONSTRAINT producciones_espanolas_tmdb_media_key UNIQUE (tmdb_id, media_type);