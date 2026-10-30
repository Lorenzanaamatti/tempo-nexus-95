ALTER TABLE public.productions ADD COLUMN IF NOT EXISTS sibling_group_id uuid;
CREATE INDEX IF NOT EXISTS productions_sibling_group_idx ON public.productions(sibling_group_id);
COMMENT ON COLUMN public.productions.sibling_group_id IS 'Entradas de la misma película, una por representado.';

CREATE OR REPLACE FUNCTION public.split_production_for_composer(_production_id uuid, _composer_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  p public.productions%ROWTYPE;
  g uuid;
  new_id uuid := gen_random_uuid();
  existing uuid;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.current_user_is_staff() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  SELECT * INTO p FROM public.productions WHERE id = _production_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Producción no encontrada'; END IF;

  IF p.composer_id IS NULL OR p.composer_id = _composer_id THEN
    UPDATE public.productions SET composer_id = _composer_id WHERE id = p.id;
    RETURN p.id;
  END IF;

  g := coalesce(p.sibling_group_id, gen_random_uuid());
  UPDATE public.productions SET sibling_group_id = g WHERE id = p.id AND sibling_group_id IS NULL;

  SELECT id INTO existing FROM public.productions WHERE sibling_group_id = g AND composer_id = _composer_id LIMIT 1;
  IF existing IS NOT NULL THEN RETURN existing; END IF;

  INSERT INTO public.productions
  SELECT (jsonb_populate_record(NULL::public.productions,
    to_jsonb(p) || jsonb_build_object('id', new_id, 'composer_id', NULL, 'sibling_group_id', g,
      'created_at', now(), 'updated_at', now()))).*;

  INSERT INTO public.production_phases
  SELECT (jsonb_populate_record(NULL::public.production_phases,
    to_jsonb(ph) || jsonb_build_object('id', gen_random_uuid(), 'production_id', new_id))).*
  FROM public.production_phases ph WHERE ph.production_id = p.id;

  INSERT INTO public.production_partner_companies
  SELECT (jsonb_populate_record(NULL::public.production_partner_companies,
    to_jsonb(x) || jsonb_build_object('id', gen_random_uuid(), 'production_id', new_id))).*
  FROM public.production_partner_companies x WHERE x.production_id = p.id;

  INSERT INTO public.production_directors
  SELECT (jsonb_populate_record(NULL::public.production_directors,
    to_jsonb(x) || jsonb_build_object('id', gen_random_uuid(), 'production_id', new_id))).*
  FROM public.production_directors x WHERE x.production_id = p.id;

  UPDATE public.production_assignments SET production_id = new_id
   WHERE production_id = p.id AND composer_id = _composer_id;

  UPDATE public.productions SET composer_id = _composer_id WHERE id = new_id;
  RETURN new_id;
END $$;
REVOKE ALL ON FUNCTION public.split_production_for_composer(uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.split_production_for_composer(uuid, uuid) TO authenticated;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT DISTINCT a.production_id, a.composer_id
    FROM public.production_assignments a
    JOIN public.productions p ON p.id = a.production_id
    WHERE a.composer_id IS NOT NULL AND p.composer_id IS NOT NULL AND a.composer_id <> p.composer_id
  LOOP
    PERFORM public.split_production_for_composer(r.production_id, r.composer_id);
  END LOOP;
END $$;