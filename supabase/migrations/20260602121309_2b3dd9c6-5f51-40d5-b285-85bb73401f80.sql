ALTER TABLE public.directors
  ADD COLUMN IF NOT EXISTS imdb_url text,
  ADD COLUMN IF NOT EXISTS website text;

ALTER TABLE public.productions
  ADD COLUMN IF NOT EXISTS imdb_url text,
  ADD COLUMN IF NOT EXISTS external_composer text;