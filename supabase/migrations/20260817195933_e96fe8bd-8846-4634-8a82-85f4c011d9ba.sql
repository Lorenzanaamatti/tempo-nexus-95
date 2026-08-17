ALTER TABLE public.producciones_espanolas
  ADD COLUMN IF NOT EXISTS mezclador text,
  ADD COLUMN IF NOT EXISTS orquestador text,
  ADD COLUMN IF NOT EXISTS orquesta text,
  ADD COLUMN IF NOT EXISTS director_orquesta text;

ALTER TABLE public.roster_prospects
  ADD COLUMN IF NOT EXISTS rol text;