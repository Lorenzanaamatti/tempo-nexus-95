ALTER TABLE public.producciones_espanolas
  ADD COLUMN IF NOT EXISTS composer text,
  ADD COLUMN IF NOT EXISTS music_supervisor text,
  ADD COLUMN IF NOT EXISTS box_office numeric,
  ADD COLUMN IF NOT EXISTS budget numeric;

CREATE INDEX IF NOT EXISTS producciones_espanolas_year_idx ON public.producciones_espanolas (year DESC);