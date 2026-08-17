ALTER TABLE public.roster_prospects
  ADD COLUMN IF NOT EXISTS ciudad text,
  ADD COLUMN IF NOT EXISTS pais text;