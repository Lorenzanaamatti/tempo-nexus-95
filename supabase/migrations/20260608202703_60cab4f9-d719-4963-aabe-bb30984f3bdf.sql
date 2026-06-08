ALTER TABLE public.composers
  ADD COLUMN IF NOT EXISTS specialist_tags text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS specialist_detail text,
  ADD COLUMN IF NOT EXISTS current_location text;