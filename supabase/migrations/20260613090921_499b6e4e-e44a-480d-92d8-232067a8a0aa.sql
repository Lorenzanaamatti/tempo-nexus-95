
-- Trigger: when a spanish_film row gets a roster composer (composer_person_id linked to a composer)
-- and no production exists yet for that spanish_film, create the production automatically.

CREATE OR REPLACE FUNCTION public.sync_spanish_film_to_production()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _composer_id uuid;
  _existing_prod_id uuid;
  _project_type production_kind;
  _dir_id uuid;
  _comp_id uuid;
  _plat_id uuid;
BEGIN
  -- Find composer in roster via people.composer_id
  IF NEW.composer_person_id IS NOT NULL THEN
    SELECT composer_id INTO _composer_id
      FROM public.people WHERE id = NEW.composer_person_id;
  END IF;

  -- Without a roster composer there is nothing to project into productions.
  IF _composer_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Skip if already projected.
  SELECT id INTO _existing_prod_id
    FROM public.productions
   WHERE spanish_film_id = NEW.id
   LIMIT 1;
  IF _existing_prod_id IS NOT NULL THEN
    -- Mantener vínculos a director/productora si quedaron vacíos y solo hay uno.
    IF array_length(NEW.director_ids, 1) = 1 THEN
      UPDATE public.productions
         SET director_id = COALESCE(director_id, NEW.director_ids[1])
       WHERE id = _existing_prod_id;
    END IF;
    IF array_length(NEW.production_company_ids, 1) = 1 THEN
      UPDATE public.productions
         SET partner_company_id = COALESCE(partner_company_id, NEW.production_company_ids[1])
       WHERE id = _existing_prod_id;
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
END $$;

DROP TRIGGER IF EXISTS spanish_films_sync_to_productions ON public.spanish_films;
CREATE TRIGGER spanish_films_sync_to_productions
AFTER INSERT OR UPDATE OF composer_person_id, director_ids, production_company_ids, title_es, title, year
ON public.spanish_films
FOR EACH ROW EXECUTE FUNCTION public.sync_spanish_film_to_production();

-- Backfill RPC used by the UI button on Películas ES.
CREATE OR REPLACE FUNCTION public.backfill_spanish_films_to_productions()
RETURNS TABLE(created_count int, linked_count int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _row record;
  _created int := 0;
  _linked int := 0;
  _composer_id uuid;
  _existing uuid;
  _dir_id uuid;
  _comp_id uuid;
  _plat_id uuid;
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  FOR _row IN
    SELECT sf.* FROM public.spanish_films sf
     WHERE sf.composer_person_id IS NOT NULL
  LOOP
    SELECT composer_id INTO _composer_id FROM public.people WHERE id = _row.composer_person_id;
    IF _composer_id IS NULL THEN CONTINUE; END IF;

    SELECT id INTO _existing FROM public.productions WHERE spanish_film_id = _row.id LIMIT 1;

    _dir_id := NULL; _comp_id := NULL; _plat_id := NULL;
    IF array_length(_row.director_ids, 1) = 1 THEN _dir_id := _row.director_ids[1]; END IF;
    IF array_length(_row.production_company_ids, 1) = 1 THEN _comp_id := _row.production_company_ids[1]; END IF;
    IF _row.platform IS NOT NULL THEN
      SELECT id INTO _plat_id FROM public.platforms WHERE lower(name) = lower(_row.platform) LIMIT 1;
    END IF;

    IF _existing IS NULL THEN
      INSERT INTO public.productions (
        title, year, project_type, composer_id, spanish_film_id,
        director_id, partner_company_id, platform_id,
        music_supervisor_person_id, platform
      ) VALUES (
        COALESCE(_row.title_es, _row.title), _row.year, 'cine'::production_kind, _composer_id, _row.id,
        _dir_id, _comp_id, _plat_id,
        _row.music_supervisor_person_id, _row.platform
      );
      _created := _created + 1;
    ELSE
      UPDATE public.productions
         SET director_id = COALESCE(director_id, _dir_id),
             partner_company_id = COALESCE(partner_company_id, _comp_id),
             platform_id = COALESCE(platform_id, _plat_id),
             composer_id = COALESCE(composer_id, _composer_id),
             music_supervisor_person_id = COALESCE(music_supervisor_person_id, _row.music_supervisor_person_id)
       WHERE id = _existing;
      _linked := _linked + 1;
    END IF;
  END LOOP;

  RETURN QUERY SELECT _created, _linked;
END $$;

GRANT EXECUTE ON FUNCTION public.backfill_spanish_films_to_productions() TO authenticated;
