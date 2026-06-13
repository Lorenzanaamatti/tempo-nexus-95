
ALTER TABLE public.spanish_films ALTER COLUMN tmdb_id DROP NOT NULL;
ALTER TABLE public.spanish_films ALTER COLUMN year DROP NOT NULL;

ALTER TABLE public.productions
  ADD COLUMN IF NOT EXISTS spanish_film_id uuid
  REFERENCES public.spanish_films(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS productions_spanish_film_id_idx
  ON public.productions(spanish_film_id);

CREATE OR REPLACE FUNCTION public.sync_production_to_spanish_films()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _eligible       boolean;
  _sf_id          uuid;
  _composer_text  text;
  _composer_pid   uuid;
  _sup_text       text;
  _platform_text  text;
  _dir_ids        uuid[];
  _comp_ids       uuid[];
BEGIN
  _eligible := NEW.project_type IN ('cine','serie','documental')
               AND NEW.title IS NOT NULL
               AND length(btrim(NEW.title)) > 0;

  IF NOT _eligible THEN
    NEW.spanish_film_id := NULL;
    RETURN NEW;
  END IF;

  IF NEW.composer_id IS NOT NULL THEN
    SELECT c.full_name, p.id
      INTO _composer_text, _composer_pid
      FROM public.composers c
      LEFT JOIN public.people p ON p.composer_id = c.id
     WHERE c.id = NEW.composer_id;
  ELSE
    _composer_text := NEW.external_composer;
    _composer_pid  := NULL;
  END IF;

  IF NEW.music_supervisor_person_id IS NOT NULL THEN
    SELECT full_name INTO _sup_text FROM public.people WHERE id = NEW.music_supervisor_person_id;
  ELSE
    _sup_text := NEW.music_supervisor_name;
  END IF;

  IF NEW.platform_id IS NOT NULL THEN
    SELECT name INTO _platform_text FROM public.platforms WHERE id = NEW.platform_id;
  ELSE
    _platform_text := NEW.platform;
  END IF;

  _dir_ids  := CASE WHEN NEW.director_id        IS NOT NULL THEN ARRAY[NEW.director_id]        ELSE ARRAY[]::uuid[] END;
  _comp_ids := CASE WHEN NEW.partner_company_id IS NOT NULL THEN ARRAY[NEW.partner_company_id] ELSE ARRAY[]::uuid[] END;

  _sf_id := NEW.spanish_film_id;
  IF _sf_id IS NULL THEN
    SELECT id INTO _sf_id
      FROM public.spanish_films
     WHERE lower(coalesce(title_es, title)) = lower(NEW.title)
       AND (NEW.year IS NULL OR year IS NULL OR year = NEW.year)
     ORDER BY updated_at DESC
     LIMIT 1;
  END IF;

  IF _sf_id IS NULL THEN
    INSERT INTO public.spanish_films (
      title, title_es, year, composer, music_supervisor, platform,
      director_ids, production_company_ids,
      composer_person_id, music_supervisor_person_id
    ) VALUES (
      NEW.title, NEW.title, NEW.year, _composer_text, _sup_text, _platform_text,
      _dir_ids, _comp_ids,
      _composer_pid, NEW.music_supervisor_person_id
    )
    RETURNING id INTO _sf_id;
  ELSE
    UPDATE public.spanish_films SET
      title_es = COALESCE(title_es, NEW.title),
      title    = COALESCE(title, NEW.title),
      year     = COALESCE(year, NEW.year),
      composer = COALESCE(_composer_text, composer),
      music_supervisor = COALESCE(_sup_text, music_supervisor),
      platform = COALESCE(_platform_text, platform),
      director_ids = CASE WHEN array_length(_dir_ids,1) IS NULL THEN director_ids ELSE _dir_ids END,
      production_company_ids = CASE WHEN array_length(_comp_ids,1) IS NULL THEN production_company_ids ELSE _comp_ids END,
      composer_person_id = COALESCE(_composer_pid, composer_person_id),
      music_supervisor_person_id = COALESCE(NEW.music_supervisor_person_id, music_supervisor_person_id),
      updated_at = now()
    WHERE id = _sf_id;
  END IF;

  NEW.spanish_film_id := _sf_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS productions_sync_spanish_films ON public.productions;
CREATE TRIGGER productions_sync_spanish_films
BEFORE INSERT OR UPDATE OF title, year, project_type, composer_id, external_composer,
  music_supervisor_person_id, music_supervisor_name, director_id, partner_company_id,
  platform_id, platform
ON public.productions
FOR EACH ROW EXECUTE FUNCTION public.sync_production_to_spanish_films();

UPDATE public.productions
   SET title = title
 WHERE project_type IN ('cine','serie','documental');
