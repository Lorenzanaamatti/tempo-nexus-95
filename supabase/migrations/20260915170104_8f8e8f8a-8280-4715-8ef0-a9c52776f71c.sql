ALTER TABLE public.oportunidades_pitches
  ADD COLUMN IF NOT EXISTS oportunidad_id uuid REFERENCES public.opportunities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS oportunidades_pitches_oportunidad_id_idx
  ON public.oportunidades_pitches(oportunidad_id);