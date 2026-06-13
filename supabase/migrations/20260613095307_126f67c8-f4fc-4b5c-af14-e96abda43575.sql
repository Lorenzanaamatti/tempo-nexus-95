
-- 1) Add enum value
ALTER TYPE public.chat_channel_kind ADD VALUE IF NOT EXISTS 'produccion';

-- 2) Add production_id column
ALTER TABLE public.chat_channels
  ADD COLUMN IF NOT EXISTS production_id uuid REFERENCES public.productions(id) ON DELETE CASCADE;

-- 3) Unique constraint: one channel per (composer, production)
CREATE UNIQUE INDEX IF NOT EXISTS chat_channels_composer_production_uidx
  ON public.chat_channels(composer_id, production_id)
  WHERE production_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS chat_channels_production_idx
  ON public.chat_channels(production_id);
