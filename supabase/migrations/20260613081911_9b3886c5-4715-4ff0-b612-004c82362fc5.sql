
ALTER TABLE public.composer_filmography
  ADD COLUMN IF NOT EXISTS director_id uuid REFERENCES public.directors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS production_company_id uuid REFERENCES public.production_companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS platform_id uuid REFERENCES public.platforms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS production_id uuid REFERENCES public.productions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS spanish_film_id uuid REFERENCES public.spanish_films(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS music_supervisor_person_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS platform text;

CREATE INDEX IF NOT EXISTS idx_filmography_director_id ON public.composer_filmography(director_id);
CREATE INDEX IF NOT EXISTS idx_filmography_company_id ON public.composer_filmography(production_company_id);
CREATE INDEX IF NOT EXISTS idx_filmography_platform_id ON public.composer_filmography(platform_id);
CREATE INDEX IF NOT EXISTS idx_filmography_production_id ON public.composer_filmography(production_id);
CREATE INDEX IF NOT EXISTS idx_filmography_spanish_film_id ON public.composer_filmography(spanish_film_id);
CREATE INDEX IF NOT EXISTS idx_filmography_supervisor_person_id ON public.composer_filmography(music_supervisor_person_id);
