
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE public.spanish_films (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tmdb_id integer UNIQUE NOT NULL,
  year integer NOT NULL,
  title text NOT NULL,
  original_title text,
  release_date date,
  poster_path text,
  overview text,
  directors text[] NOT NULL DEFAULT '{}',
  production_companies text[] NOT NULL DEFAULT '{}',
  composer text,
  music_supervisor text,
  platform text,
  box_office_eur numeric(14,2),
  director_ids uuid[] NOT NULL DEFAULT '{}',
  production_company_ids uuid[] NOT NULL DEFAULT '{}',
  composer_person_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  music_supervisor_person_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  needs_review boolean NOT NULL DEFAULT false,
  review_reason text,
  completeness smallint NOT NULL DEFAULT 0,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX spanish_films_year_idx ON public.spanish_films(year DESC);
CREATE INDEX spanish_films_needs_review_idx ON public.spanish_films(needs_review) WHERE needs_review;
CREATE INDEX spanish_films_title_trgm_idx ON public.spanish_films USING gin (title gin_trgm_ops);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.spanish_films TO authenticated;
GRANT ALL ON public.spanish_films TO service_role;

ALTER TABLE public.spanish_films ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage spanish_films"
  ON public.spanish_films FOR ALL
  TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

CREATE POLICY "Authenticated read spanish_films"
  ON public.spanish_films FOR SELECT
  TO authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.spanish_films_compute_completeness()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.completeness :=
    (CASE WHEN NEW.year IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN NEW.title IS NOT NULL AND length(NEW.title) > 0 THEN 1 ELSE 0 END) +
    (CASE WHEN array_length(NEW.directors, 1) IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN array_length(NEW.production_companies, 1) IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN NEW.composer IS NOT NULL AND length(NEW.composer) > 0 THEN 1 ELSE 0 END) +
    (CASE WHEN NEW.music_supervisor IS NOT NULL AND length(NEW.music_supervisor) > 0 THEN 1 ELSE 0 END) +
    (CASE WHEN NEW.platform IS NOT NULL AND length(NEW.platform) > 0 THEN 1 ELSE 0 END);
  RETURN NEW;
END $$;

CREATE TRIGGER spanish_films_completeness_trg
  BEFORE INSERT OR UPDATE ON public.spanish_films
  FOR EACH ROW EXECUTE FUNCTION public.spanish_films_compute_completeness();

CREATE TRIGGER spanish_films_touch_updated_at
  BEFORE UPDATE ON public.spanish_films
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
