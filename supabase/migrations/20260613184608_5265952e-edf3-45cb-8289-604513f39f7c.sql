
CREATE OR REPLACE FUNCTION public.sync_spanish_film_to_production()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _composer_id uuid;
  _existing_prod_id uuid;
  _project_type production_kind;
  _dir_id uuid;
  _comp_id uuid;
  _plat_id uuid;
BEGIN
  -- Guard against re-entrant cascades (productions ↔ spanish_films).
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF NEW.composer_person_id IS NOT NULL THEN
    SELECT composer_id INTO _composer_id
      FROM public.people WHERE id = NEW.composer_person_id;
  END IF;

  IF _composer_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO _existing_prod_id
    FROM public.productions
   WHERE spanish_film_id = NEW.id
   LIMIT 1;
  IF _existing_prod_id IS NOT NULL THEN
    -- Only fill blanks; WHERE filter prevents trigger firing on no-op updates.
    IF array_length(NEW.director_ids, 1) = 1 THEN
      UPDATE public.productions
         SET director_id = NEW.director_ids[1]
       WHERE id = _existing_prod_id AND director_id IS NULL;
    END IF;
    IF array_length(NEW.production_company_ids, 1) = 1 THEN
      UPDATE public.productions
         SET partner_company_id = NEW.production_company_ids[1]
       WHERE id = _existing_prod_id AND partner_company_id IS NULL;
    END IF;
    RETURN NEW;
  END IF;

  _project_type := 'cine'::production_kind;
  IF array_length(NEW.director_ids, 1) = 1 THEN _dir_id := NEW.director_ids[1]; END IF;
  IF array_length(NEW.production_company_ids, 1) = 1 THEN _comp_id := NEW.production_company_ids[1]; END IF;

  IF NEW.platform IS NOT NULL THEN
    SELECT id INTO _plat_id FROM public.platforms WHERE lower(name) = lower(NEW.platform) LIMIT 1;
  END IF;

  INSERT INTO public.productions (
    title, year, project_type, composer_id, spanish_film_id,
    director_id, partner_company_id, platform_id,
    music_supervisor_person_id, platform
  ) VALUES (
    COALESCE(NEW.title_es, NEW.title), NEW.year, _project_type, _composer_id, NEW.id,
    _dir_id, _comp_id, _plat_id,
    NEW.music_supervisor_person_id, NEW.platform
  );

  RETURN NEW;
END $function$;

-- Symmetric guard on the productions side, in case future edits add another path back.
CREATE OR REPLACE FUNCTION public.sync_production_to_spanish_films()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

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
END $function$;
