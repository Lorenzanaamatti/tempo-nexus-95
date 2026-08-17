
CREATE TYPE public.subvencion_ambito AS ENUM ('Local','Autonómico','Nacional','Europeo','Internacional');
CREATE TYPE public.subvencion_tipo AS ENUM ('Producción musical','Internacionalización','Formación','Investigación','Otro');
CREATE TYPE public.subvencion_estado AS ENUM ('Sin valorar','En preparación','Solicitada','Concedida','Denegada');
CREATE TYPE public.festival_tier AS ENUM ('A','Internacional','Nacional','Regional');
CREATE TYPE public.festival_tipo AS ENUM ('Competición','Mercado','Música','Documental','Cortometraje','Animación','Otro');
CREATE TYPE public.festival_estado AS ENUM ('Identificado','En preparación','Inscrito','Seleccionado','No seleccionado','Premio obtenido');
CREATE TYPE public.premio_estado AS ENUM ('Identificado','Candidatura enviada','Nominado','Premio obtenido','No seleccionado');

CREATE TABLE public.oportunidades_subvenciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institucion_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  institucion_nombre text,
  nombre_convocatoria text NOT NULL,
  ambito public.subvencion_ambito NOT NULL DEFAULT 'Nacional',
  tipo public.subvencion_tipo NOT NULL DEFAULT 'Otro',
  importe_maximo numeric,
  fecha_apertura date,
  fecha_limite_solicitud date NOT NULL,
  fecha_resolucion date,
  requisitos text,
  url_convocatoria text,
  estado public.subvencion_estado NOT NULL DEFAULT 'Sin valorar',
  importe_solicitado numeric,
  importe_concedido numeric,
  representado_vinculado uuid REFERENCES public.composers(id) ON DELETE SET NULL,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.oportunidades_festivales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institucion_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  nombre_festival text NOT NULL,
  edicion text,
  tier public.festival_tier NOT NULL DEFAULT 'Nacional',
  tipo public.festival_tipo NOT NULL DEFAULT 'Otro',
  fecha_inicio date,
  fecha_fin date,
  fecha_deadline_inscripcion date NOT NULL,
  pais text,
  ciudad text,
  url text,
  representado_vinculado uuid REFERENCES public.composers(id) ON DELETE SET NULL,
  produccion_vinculada uuid REFERENCES public.productions(id) ON DELETE SET NULL,
  estado public.festival_estado NOT NULL DEFAULT 'Identificado',
  resultado_notas text,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.oportunidades_premios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institucion_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  nombre_premio text NOT NULL,
  categoria text,
  edicion text,
  fecha_apertura_candidaturas date,
  fecha_limite_inscripcion date NOT NULL,
  fecha_gala_fallo date,
  pais text,
  url text,
  representado_vinculado uuid REFERENCES public.composers(id) ON DELETE SET NULL,
  produccion_vinculada uuid REFERENCES public.productions(id) ON DELETE SET NULL,
  estado public.premio_estado NOT NULL DEFAULT 'Identificado',
  resultado_notas text,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.oportunidades_subvenciones TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.oportunidades_festivales TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.oportunidades_premios TO authenticated;
GRANT ALL ON public.oportunidades_subvenciones TO service_role;
GRANT ALL ON public.oportunidades_festivales TO service_role;
GRANT ALL ON public.oportunidades_premios TO service_role;

ALTER TABLE public.oportunidades_subvenciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oportunidades_festivales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oportunidades_premios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subvenciones read" ON public.oportunidades_subvenciones FOR SELECT TO authenticated USING (public.current_user_is_admin());
CREATE POLICY "subvenciones write" ON public.oportunidades_subvenciones FOR ALL TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
CREATE POLICY "festivales read" ON public.oportunidades_festivales FOR SELECT TO authenticated USING (public.current_user_is_admin());
CREATE POLICY "festivales write" ON public.oportunidades_festivales FOR ALL TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
CREATE POLICY "premios read" ON public.oportunidades_premios FOR SELECT TO authenticated USING (public.current_user_is_admin());
CREATE POLICY "premios write" ON public.oportunidades_premios FOR ALL TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

CREATE TRIGGER subvenciones_touch BEFORE UPDATE ON public.oportunidades_subvenciones FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER festivales_touch BEFORE UPDATE ON public.oportunidades_festivales FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER premios_touch BEFORE UPDATE ON public.oportunidades_premios FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Persona responsable por defecto: agente del representado o, si no hay, un BIG C
CREATE OR REPLACE FUNCTION public.deadline_owner_person(_composer_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  select coalesce(
    (select c.agent_person_id from public.composers c where c.id = _composer_id),
    (select p.id from public.people p join public.user_roles ur on ur.user_id = p.user_id
      where ur.role = 'admin' order by p.created_at limit 1)
  )
$$;

-- Sincroniza calendario + preaviso de 30 días para las tres nuevas oportunidades
CREATE OR REPLACE FUNCTION public.sync_deadline_opportunity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _subject public.calendar_subject_type;
  _cat public.calendar_category;
  _area public.action_area;
  _badge text;
  _name text;
  _deadline date;
  _gala date;
  _composer uuid;
  _owner uuid;
  _id uuid;
  _link text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.calendar_events WHERE subject_id = OLD.id AND source_kind LIKE 'deadline_%';
    DELETE FROM public.actions WHERE subject_id = OLD.id AND kind = 'tarea' AND subarea = 'preaviso_deadline';
    RETURN OLD;
  END IF;

  _id := NEW.id;
  IF TG_TABLE_NAME = 'oportunidades_subvenciones' THEN
    _subject := 'grant'; _cat := 'legal'; _area := 'legal'; _badge := 'Subvención';
    _name := NEW.nombre_convocatoria; _deadline := NEW.fecha_limite_solicitud;
    _composer := NEW.representado_vinculado;
    _link := '/oportunidades/subvenciones/' || _id::text;
  ELSIF TG_TABLE_NAME = 'oportunidades_festivales' THEN
    _subject := 'festival'; _cat := 'operativo'; _area := 'produccion'; _badge := 'Festival';
    _name := NEW.nombre_festival; _deadline := NEW.fecha_deadline_inscripcion;
    _composer := NEW.representado_vinculado;
    _link := '/oportunidades/festivales/' || _id::text;
  ELSE
    _subject := 'award'; _cat := 'operativo'; _area := 'produccion'; _badge := 'Premio';
    _name := NEW.nombre_premio; _deadline := NEW.fecha_limite_inscripcion; _gala := NEW.fecha_gala_fallo;
    _composer := NEW.representado_vinculado;
    _link := '/oportunidades/premios/' || _id::text;
  END IF;

  DELETE FROM public.calendar_events WHERE subject_id = _id AND source_kind LIKE 'deadline_%';
  DELETE FROM public.actions WHERE subject_id = _id AND kind = 'tarea' AND subarea = 'preaviso_deadline' AND done = false;

  IF _deadline IS NOT NULL THEN
    INSERT INTO public.calendar_events (subject_type, subject_id, kind, calendar_category, start_date, end_date, title, note, source_kind)
    VALUES (_subject, _id, 'deadline', _cat, _deadline, _deadline, _badge || ' · ' || _name, _link, 'deadline_' || lower(_badge));

    _owner := public.deadline_owner_person(_composer);
    INSERT INTO public.actions (subject_type, subject_id, title, notes, kind, due_date, assignee_person_id, area, subarea)
    VALUES (
      _subject, _id,
      'Deadline en 30 días: ' || _name || ' — ' || to_char(_deadline, 'DD/MM/YYYY'),
      _link, 'tarea', _deadline - 30, _owner, _area, 'preaviso_deadline'
    );
  END IF;

  IF _gala IS NOT NULL THEN
    INSERT INTO public.calendar_events (subject_type, subject_id, kind, calendar_category, start_date, end_date, title, note, source_kind)
    VALUES (_subject, _id, 'gala', _cat, _gala, _gala, 'Gala/fallo · ' || _name, _link, 'deadline_gala');
  END IF;

  RETURN NEW;
END $$;

CREATE TRIGGER subvenciones_sync AFTER INSERT OR UPDATE OR DELETE ON public.oportunidades_subvenciones FOR EACH ROW EXECUTE FUNCTION public.sync_deadline_opportunity();
CREATE TRIGGER festivales_sync AFTER INSERT OR UPDATE OR DELETE ON public.oportunidades_festivales FOR EACH ROW EXECUTE FUNCTION public.sync_deadline_opportunity();
CREATE TRIGGER premios_sync AFTER INSERT OR UPDATE OR DELETE ON public.oportunidades_premios FOR EACH ROW EXECUTE FUNCTION public.sync_deadline_opportunity();

REVOKE EXECUTE ON FUNCTION public.deadline_owner_person(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_deadline_opportunity() FROM anon, authenticated;
