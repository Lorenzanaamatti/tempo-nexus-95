CREATE OR REPLACE FUNCTION public.roster_prospect_accept()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _cid uuid; _role roster_role; _slug text;
BEGIN
  IF NEW.estado <> 'aceptado' OR (TG_OP = 'UPDATE' AND OLD.estado = 'aceptado') THEN RETURN NEW; END IF;
  _role := CASE WHEN coalesce(NEW.rol,'') ILIKE '%supervis%' THEN 'supervisor'::roster_role ELSE 'composer'::roster_role END;
  _cid := NEW.composer_id;
  IF _cid IS NULL THEN
    SELECT id INTO _cid FROM composers WHERE lower(full_name) = lower(trim(NEW.nombre)) LIMIT 1;
  END IF;
  IF _cid IS NULL THEN
    _slug := trim(both '-' from regexp_replace(lower(NEW.nombre), '[^a-z0-9]+', '-', 'g'));
    IF _slug = '' OR EXISTS (SELECT 1 FROM composers WHERE slug = _slug) THEN
      _slug := coalesce(nullif(_slug,''),'roster') || '-' || substr(gen_random_uuid()::text,1,6);
    END IF;
    INSERT INTO composers (full_name, slug, roster_role, representation_status, city, country, internal_notes)
    VALUES (trim(NEW.nombre), _slug, _role, 'activo', NEW.ciudad, NEW.pais,
      concat_ws(E'\n', 'Primer contacto: ' || to_char(NEW.fecha_primer_contacto,'DD/MM/YYYY'), NEW.notas))
    RETURNING id INTO _cid;
  ELSE
    UPDATE composers SET representation_status = 'activo', roster_role = _role,
      city = coalesce(city, NEW.ciudad), country = coalesce(country, NEW.pais) WHERE id = _cid;
  END IF;
  NEW.composer_id := _cid;
  NEW.fecha_decision := coalesce(NEW.fecha_decision, CURRENT_DATE);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_roster_prospect_accept ON public.roster_prospects;
CREATE TRIGGER trg_roster_prospect_accept BEFORE INSERT OR UPDATE OF estado ON public.roster_prospects
FOR EACH ROW EXECUTE FUNCTION public.roster_prospect_accept();