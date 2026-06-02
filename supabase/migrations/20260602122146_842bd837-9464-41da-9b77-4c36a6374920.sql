ALTER TABLE public.productions
  ADD COLUMN IF NOT EXISTS production_director_name text,
  ADD COLUMN IF NOT EXISTS postproduction_supervisor_name text,
  ADD COLUMN IF NOT EXISTS music_supervisor_name text;