
CREATE TABLE public.subv_fuentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text UNIQUE NOT NULL,
  prioridad text,
  categoria text,
  subcategoria text,
  nombre text NOT NULL,
  naturaleza text,
  territorio text,
  cobertura text,
  tipos_oportunidad text,
  beneficiarios text,
  relev_empresa text,
  relev_cultura text,
  relev_mujeres text,
  relev_tech text,
  dinero_directo text,
  que_aporta text,
  limitaciones text,
  metodo_conexion text,
  nivel_automatizacion text,
  frecuencia text,
  url_portal text,
  url_tecnica text,
  notas_tecnicas text,
  verificacion text,
  conector text,
  activa boolean NOT NULL DEFAULT false,
  last_checked_at timestamptz,
  next_check_at timestamptz,
  last_success_at timestamptz,
  last_change_at timestamptz,
  health_status text NOT NULL DEFAULT 'OK',
  last_error text,
  parser_version text,
  content_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.subv_programas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text,
  nombre text NOT NULL,
  area text,
  tipo_apoyo text,
  beneficiarios text,
  recurrencia text,
  por_que_importa text,
  url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.subv_taxonomias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo text NOT NULL,
  valor text NOT NULL,
  definicion text,
  UNIQUE (grupo, valor)
);

CREATE TABLE public.subv_oportunidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fuente_id uuid REFERENCES public.subv_fuentes(id) ON DELETE SET NULL,
  source_id text,
  titulo text NOT NULL,
  organismo text,
  descripcion text,
  territorio text,
  sector text,
  destinatarios text,
  tipo_oportunidad text,
  importe numeric,
  fecha_publicacion date,
  fecha_limite date,
  source_item_id text,
  source_item_url text,
  content_hash text,
  duplicate_key text UNIQUE,
  bdns text,
  score_ia integer,
  motivo_ia text,
  excluyentes_ia text,
  analizada_ia boolean NOT NULL DEFAULT false,
  estado text NOT NULL DEFAULT 'nueva',
  decidido_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decidido_at timestamptz,
  notas text,
  detectada_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX subv_oport_estado_idx ON public.subv_oportunidades (estado, score_ia DESC NULLS LAST, fecha_limite);
CREATE INDEX subv_oport_fuente_idx ON public.subv_oportunidades (fuente_id);

CREATE TABLE public.subv_expedientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oportunidad_id uuid REFERENCES public.subv_oportunidades(id) ON DELETE SET NULL,
  titulo text NOT NULL,
  organismo text,
  convocatoria_url text,
  importe_solicitado numeric,
  importe_concedido numeric,
  fecha_limite date,
  fecha_presentacion date,
  fecha_resolucion date,
  estado text NOT NULL DEFAULT 'preparando',
  responsable_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  empresa text,
  requisitos text,
  documentacion_pendiente text,
  notas text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.subv_expediente_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expediente_id uuid NOT NULL REFERENCES public.subv_expedientes(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  archivo_path text,
  tipo text,
  subido_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.subv_capturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fuente_id uuid REFERENCES public.subv_fuentes(id) ON DELETE CASCADE,
  conector text,
  ok boolean NOT NULL DEFAULT true,
  nuevas integer NOT NULL DEFAULT 0,
  repetidas integer NOT NULL DEFAULT 0,
  mensaje text,
  duracion_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX subv_capturas_fecha_idx ON public.subv_capturas (created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.subv_fuentes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subv_programas TO authenticated;
GRANT SELECT ON public.subv_taxonomias TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subv_oportunidades TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subv_expedientes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subv_expediente_documentos TO authenticated;
GRANT SELECT ON public.subv_capturas TO authenticated;
GRANT ALL ON public.subv_fuentes, public.subv_programas, public.subv_taxonomias, public.subv_oportunidades, public.subv_expedientes, public.subv_expediente_documentos, public.subv_capturas TO service_role;

ALTER TABLE public.subv_fuentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subv_programas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subv_taxonomias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subv_oportunidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subv_expedientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subv_expediente_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subv_capturas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subv_fuentes_lectura" ON public.subv_fuentes FOR SELECT TO authenticated USING (public.current_user_is_staff());
CREATE POLICY "subv_fuentes_escritura" ON public.subv_fuentes FOR UPDATE TO authenticated USING (public.current_user_is_staff()) WITH CHECK (public.current_user_is_staff());
CREATE POLICY "subv_fuentes_alta" ON public.subv_fuentes FOR INSERT TO authenticated WITH CHECK (public.current_user_is_staff());
CREATE POLICY "subv_fuentes_borrado" ON public.subv_fuentes FOR DELETE TO authenticated USING (public.current_user_is_admin());

CREATE POLICY "subv_programas_todo" ON public.subv_programas FOR ALL TO authenticated USING (public.current_user_is_staff()) WITH CHECK (public.current_user_is_staff());
CREATE POLICY "subv_taxonomias_lectura" ON public.subv_taxonomias FOR SELECT TO authenticated USING (public.current_user_is_staff());
CREATE POLICY "subv_oportunidades_todo" ON public.subv_oportunidades FOR ALL TO authenticated USING (public.current_user_is_staff()) WITH CHECK (public.current_user_is_staff());
CREATE POLICY "subv_expedientes_todo" ON public.subv_expedientes FOR ALL TO authenticated USING (public.current_user_is_staff()) WITH CHECK (public.current_user_is_staff());
CREATE POLICY "subv_exp_docs_todo" ON public.subv_expediente_documentos FOR ALL TO authenticated USING (public.current_user_is_staff()) WITH CHECK (public.current_user_is_staff());
CREATE POLICY "subv_capturas_lectura" ON public.subv_capturas FOR SELECT TO authenticated USING (public.current_user_is_staff());

CREATE OR REPLACE FUNCTION public.subv_touch_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER subv_fuentes_touch BEFORE UPDATE ON public.subv_fuentes FOR EACH ROW EXECUTE FUNCTION public.subv_touch_updated_at();
CREATE TRIGGER subv_oportunidades_touch BEFORE UPDATE ON public.subv_oportunidades FOR EACH ROW EXECUTE FUNCTION public.subv_touch_updated_at();
CREATE TRIGGER subv_expedientes_touch BEFORE UPDATE ON public.subv_expedientes FOR EACH ROW EXECUTE FUNCTION public.subv_touch_updated_at();

CREATE POLICY "subv_docs_leer" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'subvenciones-documentos' AND public.current_user_is_staff());
CREATE POLICY "subv_docs_subir" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'subvenciones-documentos' AND public.current_user_is_staff());
CREATE POLICY "subv_docs_actualizar" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'subvenciones-documentos' AND public.current_user_is_staff());
CREATE POLICY "subv_docs_borrar" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'subvenciones-documentos' AND (owner = auth.uid() OR public.current_user_is_admin()));
