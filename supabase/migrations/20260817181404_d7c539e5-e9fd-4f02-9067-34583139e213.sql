CREATE TYPE public.genero_persona AS ENUM ('mujer','hombre','no_binario','no_indica');

ALTER TABLE public.composers
  ADD COLUMN IF NOT EXISTS genero public.genero_persona,
  ADD COLUMN IF NOT EXISTS pais_origen text,
  ADD COLUMN IF NOT EXISTS ciudad_origen text;

CREATE INDEX IF NOT EXISTS idx_composers_genero ON public.composers (genero);
CREATE INDEX IF NOT EXISTS idx_composers_pais_origen ON public.composers (pais_origen);