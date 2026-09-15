ALTER TABLE public.oportunidades_pitches
  ADD COLUMN IF NOT EXISTS archivado_at timestamptz,
  ADD COLUMN IF NOT EXISTS archivado_motivo text,
  ADD COLUMN IF NOT EXISTS archivado_by uuid REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS oportunidades_pitches_archivado_idx ON public.oportunidades_pitches (archivado_at);
CREATE INDEX IF NOT EXISTS oportunidades_pitches_produccion_idx ON public.oportunidades_pitches (produccion_id);