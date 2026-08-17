ALTER TABLE public.producciones_espanolas
  ADD COLUMN IF NOT EXISTS origen text NOT NULL DEFAULT 'tmdb',
  ADD COLUMN IF NOT EXISTS ic_personas text[] NOT NULL DEFAULT '{}';

-- Detecta nombres que coinciden con personas del roster IC (composers).
CREATE OR REPLACE FUNCTION public.detect_ic_personas(_names text[])
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(array_agg(DISTINCT nom), '{}'::text[])
  FROM (
    SELECT coalesce(nullif(c.artistic_name, ''), c.full_name) AS nom,
           lower(btrim(c.full_name)) AS f,
           lower(btrim(coalesce(c.artistic_name, ''))) AS a
    FROM public.composers c
  ) c
  JOIN unnest(coalesce(_names, '{}'::text[])) AS n(v)
    ON lower(btrim(n.v)) = c.f OR (c.a <> '' AND lower(btrim(n.v)) = c.a)
$$;

REVOKE ALL ON FUNCTION public.detect_ic_personas(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.detect_ic_personas(text[]) TO authenticated, service_role;

-- Marca IC participa y guarda las personas IC detectadas.
CREATE OR REPLACE FUNCTION public.espanolas_mark_ic()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v text[];
  r text[];
BEGIN
  v := public.detect_ic_personas(
    array_remove(
      ARRAY[NEW.composer, NEW.music_supervisor, NEW.mezclador, NEW.orquestador, NEW.orquesta, NEW.director_orquesta]
      || coalesce(NEW.directors, '{}'::text[]),
      NULL
    )
  );

  IF coalesce(array_length(NEW.representados_vinculados, 1), 0) > 0 THEN
    SELECT coalesce(array_agg(DISTINCT coalesce(nullif(c.artistic_name, ''), c.full_name)), '{}'::text[])
      INTO r
      FROM public.composers c
     WHERE c.id = ANY (NEW.representados_vinculados::uuid[]);
    SELECT coalesce(array_agg(DISTINCT x), '{}'::text[]) INTO v FROM unnest(v || coalesce(r, '{}'::text[])) AS t(x);
  END IF;

  NEW.ic_personas := coalesce(v, '{}'::text[]);

  IF coalesce(array_length(NEW.ic_personas, 1), 0) > 0
     OR NEW.produccion_ic_vinculada IS NOT NULL THEN
    NEW.ic_participo := true;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_espanolas_mark_ic ON public.producciones_espanolas;
CREATE TRIGGER trg_espanolas_mark_ic
BEFORE INSERT OR UPDATE ON public.producciones_espanolas
FOR EACH ROW EXECUTE FUNCTION public.espanolas_mark_ic();

-- Vuelca cada producción IC (activa o finalizada) a Producciones españolas.
CREATE OR REPLACE FUNCTION public.sync_production_to_espanolas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_comp text;
BEGIN
  SELECT coalesce(nullif(c.artistic_name, ''), c.full_name) INTO v_comp
    FROM public.composers c WHERE c.id = NEW.composer_id;
  v_comp := coalesce(v_comp, NEW.external_composer);

  SELECT pe.id INTO v_id FROM public.producciones_espanolas pe
   WHERE pe.produccion_ic_vinculada = NEW.id LIMIT 1;

  IF v_id IS NULL THEN
    SELECT pe.id INTO v_id FROM public.producciones_espanolas pe
     WHERE lower(btrim(coalesce(pe.title_es, pe.title))) = lower(btrim(NEW.title))
       AND (NEW.year IS NULL OR pe.year IS NULL OR pe.year = NEW.year)
     ORDER BY pe.year IS DISTINCT FROM NEW.year
     LIMIT 1;
  END IF;

  IF v_id IS NULL THEN
    INSERT INTO public.producciones_espanolas
      (title, title_es, year, media_type, composer, music_supervisor, platform,
       production_companies, directors, ic_participo, produccion_ic_vinculada, origen, notas)
    VALUES
      (NEW.title, NEW.title, NEW.year,
       CASE WHEN NEW.kind = 'serie' THEN 'tv' ELSE 'movie' END,
       v_comp, NEW.music_supervisor_name, NEW.platform,
       array_remove(ARRAY[NEW.production_company], NULL),
       array_remove(ARRAY[NEW.director], NULL),
       true, NEW.id, 'produccion_ic', 'Ficha creada desde Producciones IC');
  ELSE
    UPDATE public.producciones_espanolas pe SET
      produccion_ic_vinculada = NEW.id,
      ic_participo = true,
      composer = coalesce(pe.composer, v_comp),
      music_supervisor = coalesce(pe.music_supervisor, NEW.music_supervisor_name),
      platform = coalesce(pe.platform, NEW.platform),
      origen = CASE WHEN pe.origen = 'tmdb' THEN 'tmdb' ELSE 'produccion_ic' END
    WHERE pe.id = v_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_production_to_espanolas ON public.productions;
CREATE TRIGGER trg_sync_production_to_espanolas
AFTER INSERT OR UPDATE OF title, year, kind, composer_id, external_composer, music_supervisor_name, platform, production_company, director
ON public.productions
FOR EACH ROW EXECUTE FUNCTION public.sync_production_to_espanolas();

-- Vuelca las oportunidades de venta con título de producción a Producciones españolas.
CREATE OR REPLACE FUNCTION public.sync_opportunity_to_espanolas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_title text;
BEGIN
  IF NEW.target_production_id IS NOT NULL THEN
    SELECT p.title INTO v_title FROM public.productions p WHERE p.id = NEW.target_production_id;
  END IF;
  v_title := coalesce(v_title, nullif(btrim(coalesce(NEW.target_production_text, '')), ''));
  IF v_title IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT pe.id INTO v_id FROM public.producciones_espanolas pe
   WHERE pe.oportunidad_vinculada = NEW.id LIMIT 1;

  IF v_id IS NULL THEN
    SELECT pe.id INTO v_id FROM public.producciones_espanolas pe
     WHERE lower(btrim(coalesce(pe.title_es, pe.title))) = lower(btrim(v_title))
     LIMIT 1;
  END IF;

  IF v_id IS NULL THEN
    INSERT INTO public.producciones_espanolas
      (title, title_es, media_type, platform, production_companies,
       oportunidad_vinculada, estado_prospeccion, origen, notas)
    VALUES
      (v_title, v_title, 'movie', NULL,
       array_remove(ARRAY[NEW.partner_name], NULL),
       NEW.id, 'interesa_contactar', 'oportunidad',
       'Ficha creada desde Oportunidades de ventas: ' || NEW.title);
  ELSE
    UPDATE public.producciones_espanolas pe SET
      oportunidad_vinculada = NEW.id,
      origen = CASE WHEN pe.origen = 'tmdb' THEN 'tmdb' ELSE pe.origen END,
      estado_prospeccion = CASE WHEN pe.estado_prospeccion = 'sin_valorar' THEN 'interesa_contactar' ELSE pe.estado_prospeccion END
    WHERE pe.id = v_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_opportunity_to_espanolas ON public.opportunities;
CREATE TRIGGER trg_sync_opportunity_to_espanolas
AFTER INSERT OR UPDATE OF title, target_production_id, target_production_text, partner_name
ON public.opportunities
FOR EACH ROW EXECUTE FUNCTION public.sync_opportunity_to_espanolas();

-- Backfill del histórico existente.
DO $$
DECLARE p record; o record;
BEGIN
  FOR p IN SELECT * FROM public.productions LOOP
    PERFORM 1;
    UPDATE public.productions SET updated_at = updated_at WHERE id = p.id;
  END LOOP;
  FOR o IN SELECT * FROM public.opportunities LOOP
    UPDATE public.opportunities SET updated_at = updated_at WHERE id = o.id;
  END LOOP;
END $$;

UPDATE public.producciones_espanolas SET updated_at = updated_at;