-- 1) Add personal/contact fields to composers
ALTER TABLE public.composers
  ADD COLUMN IF NOT EXISTS nif text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS province text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS email_secondary text,
  ADD COLUMN IF NOT EXISTS team_email text,
  ADD COLUMN IF NOT EXISTS team_name text;

-- 2) Gallery: up to 12 photos per composer, each with year + copyright
CREATE TABLE IF NOT EXISTS public.composer_photos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  composer_id uuid NOT NULL REFERENCES public.composers(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  year integer,
  copyright text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS composer_photos_composer_idx
  ON public.composer_photos(composer_id, position);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.composer_photos TO authenticated;
GRANT ALL ON public.composer_photos TO service_role;

ALTER TABLE public.composer_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "composer_photos all"
  ON public.composer_photos
  FOR ALL
  TO authenticated
  USING (public.can_access_composer(composer_id))
  WITH CHECK (public.can_access_composer(composer_id));

-- 3) Enforce 12-photo cap
CREATE OR REPLACE FUNCTION public.composer_photos_enforce_cap()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _count integer;
BEGIN
  SELECT count(*) INTO _count FROM public.composer_photos WHERE composer_id = NEW.composer_id;
  IF _count >= 12 THEN
    RAISE EXCEPTION 'Cada compositor puede tener un máximo de 12 fotografías';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS composer_photos_cap ON public.composer_photos;
CREATE TRIGGER composer_photos_cap
  BEFORE INSERT ON public.composer_photos
  FOR EACH ROW EXECUTE FUNCTION public.composer_photos_enforce_cap();
