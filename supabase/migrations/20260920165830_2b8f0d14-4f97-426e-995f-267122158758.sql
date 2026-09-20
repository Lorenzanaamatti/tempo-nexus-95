ALTER TABLE public.oportunidades_subvenciones
  ALTER COLUMN estado DROP DEFAULT,
  ALTER COLUMN estado TYPE text USING estado::text,
  ALTER COLUMN estado SET DEFAULT 'Por preparar',
  ALTER COLUMN fecha_limite_solicitud DROP NOT NULL,
  ADD COLUMN nombre_corto text,
  ADD COLUMN empresa_solicitante text,
  ADD COLUMN proyecto_vinculado text,
  ADD COLUMN responsable_person_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  ADD COLUMN asesor_externo text,
  ADD COLUMN url_tramitacion text,
  ADD COLUMN numero_expediente text,
  ADD COLUMN porcentaje_subvencionable numeric,
  ADD COLUMN periodo_ejecucion_inicio date,
  ADD COLUMN periodo_ejecucion_fin date,
  ADD COLUMN presupuesto_minimo numeric,
  ADD COLUMN presupuesto_maximo numeric,
  ADD COLUMN presupuesto_total_proyecto numeric,
  ADD COLUMN gasto_elegible_previsto numeric,
  ADD COLUMN porcentaje_solicitado numeric,
  ADD COLUMN aportacion_propia numeric,
  ADD COLUMN otros_financiadores text,
  ADD COLUMN importe_justificado numeric,
  ADD COLUMN importe_cobrado numeric,
  ADD COLUMN existe_anticipo boolean NOT NULL DEFAULT false,
  ADD COLUMN porcentaje_anticipo numeric,
  ADD COLUMN importe_anticipo numeric,
  ADD COLUMN fecha_cobro_anticipo_estimada date,
  ADD COLUMN importe_financiar_empresa numeric,
  ADD COLUMN fecha_cobro_final_estimada date,
  ADD COLUMN iva_subvencionable boolean NOT NULL DEFAULT false,
  ADD COLUMN formulario_presentacion text,
  ADD COLUMN idioma_presentacion text,
  ADD COLUMN max_paginas_memoria integer,
  ADD COLUMN formato_archivo text,
  ADD COLUMN max_tamano_archivos text,
  ADD COLUMN firma_requerida boolean NOT NULL DEFAULT false,
  ADD COLUMN quien_puede_firmar text,
  ADD COLUMN certificado_digital_necesario boolean NOT NULL DEFAULT false,
  ADD COLUMN numero_ofertas_exigidas integer,
  ADD COLUMN documentos_modelo_oficial text,
  ADD COLUMN documentos_generacion_libre text,
  ADD COLUMN portal_presentacion text,
  ADD COLUMN forma_presentacion text,
  ADD COLUMN particularidades text,
  ADD COLUMN reglas_no_olvidar text,
  ADD COLUMN presentada_fecha date,
  ADD COLUMN presentada_hora time,
  ADD COLUMN numero_registro text,
  ADD COLUMN presentada_por_person_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  ADD COLUMN fecha_resolucion_provisional date,
  ADD COLUMN resultado_provisional text,
  ADD COLUMN importe_provisional numeric,
  ADD COLUMN alegaciones_necesarias boolean NOT NULL DEFAULT false,
  ADD COLUMN fecha_limite_alegaciones date,
  ADD COLUMN fecha_resolucion_definitiva date,
  ADD COLUMN porcentaje_concedido numeric,
  ADD COLUMN condiciones_particulares text,
  ADD COLUMN fecha_aceptacion date,
  ADD COLUMN anticipo_cobrado numeric,
  ADD COLUMN fecha_anticipo date,
  ADD COLUMN saldo_pendiente numeric,
  ADD COLUMN fecha_cobro_estimada date,
  ADD COLUMN fecha_cobro_real date,
  ADD COLUMN fecha_limite_justificacion date,
  ADD COLUMN modalidad_justificacion text,
  ADD COLUMN auditor_requerido boolean NOT NULL DEFAULT false,
  ADD COLUMN memoria_final_requerida boolean NOT NULL DEFAULT false,
  ADD COLUMN cuenta_justificativa_requerida boolean NOT NULL DEFAULT false,
  ADD COLUMN facturas_requeridas boolean NOT NULL DEFAULT false,
  ADD COLUMN justificantes_bancarios_requeridos boolean NOT NULL DEFAULT false,
  ADD COLUMN nominas_tc_requeridos boolean NOT NULL DEFAULT false,
  ADD COLUMN evidencias_proyecto_requeridas boolean NOT NULL DEFAULT false,
  ADD COLUMN obligaciones_publicidad text,
  ADD COLUMN otra_documentacion_conservar text,
  ADD COLUMN responsable_justificacion_person_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  ADD COLUMN justificacion_preparada boolean NOT NULL DEFAULT false,
  ADD COLUMN justificacion_presentada boolean NOT NULL DEFAULT false,
  ADD COLUMN fecha_presentacion_justificacion date,
  ADD COLUMN importe_aceptado numeric,
  ADD COLUMN requerimientos text,
  ADD COLUMN expediente_cerrado boolean NOT NULL DEFAULT false;

UPDATE public.oportunidades_subvenciones
SET nombre_corto = nombre_convocatoria,
    estado = CASE estado
      WHEN 'Sin valorar' THEN 'Por preparar'
      WHEN 'Solicitada' THEN 'Presentada'
      ELSE estado
    END
WHERE nombre_corto IS NULL;

ALTER TABLE public.oportunidades_subvenciones
  ALTER COLUMN nombre_corto SET NOT NULL,
  ADD CONSTRAINT oportunidades_subvenciones_estado_check CHECK (estado IN ('Por preparar','En preparación','Pendiente firma','Presentada','Subsanación','Concedida','Denegada','En ejecución','En justificación','Cobrada','Cerrada'));

CREATE TABLE public.subvencion_partidas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subvencion_id uuid NOT NULL REFERENCES public.oportunidades_subvenciones(id) ON DELETE CASCADE,
  concepto text NOT NULL,
  categoria text,
  proveedor text,
  presupuesto_previsto numeric NOT NULL DEFAULT 0,
  gasto_elegible numeric NOT NULL DEFAULT 0,
  porcentaje_financiable numeric,
  subvencion_imputable numeric NOT NULL DEFAULT 0,
  aportacion_propia numeric NOT NULL DEFAULT 0,
  presupuesto_oferta_recibido boolean NOT NULL DEFAULT false,
  factura_recibida boolean NOT NULL DEFAULT false,
  pagado boolean NOT NULL DEFAULT false,
  justificado boolean NOT NULL DEFAULT false,
  general_budget_category public.ic_budget_category NOT NULL DEFAULT 'gasto_otros',
  general_budget_year integer,
  general_budget_month integer CHECK (general_budget_month BETWEEN 1 AND 12),
  sent_to_general_budget_at timestamptz,
  general_budget_line_id uuid REFERENCES public.ic_budget_lines(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subvencion_partidas TO authenticated;
GRANT ALL ON public.subvencion_partidas TO service_role;
ALTER TABLE public.subvencion_partidas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subvencion partidas admin" ON public.subvencion_partidas FOR ALL TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

CREATE TABLE public.subvencion_hitos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subvencion_id uuid NOT NULL REFERENCES public.oportunidades_subvenciones(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  fecha_oficial date,
  fecha_interna date,
  responsable_person_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  estado text NOT NULL DEFAULT 'Pendiente',
  alerta_dias integer,
  calendar_event_id uuid REFERENCES public.calendar_events(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subvencion_hitos TO authenticated;
GRANT ALL ON public.subvencion_hitos TO service_role;
ALTER TABLE public.subvencion_hitos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subvencion hitos admin" ON public.subvencion_hitos FOR ALL TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

CREATE TABLE public.subvencion_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subvencion_id uuid NOT NULL REFERENCES public.oportunidades_subvenciones(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  obligatorio boolean NOT NULL DEFAULT false,
  responsable_person_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  proporcionado_por text,
  plantilla_disponible boolean NOT NULL DEFAULT false,
  archivo_path text,
  estado text NOT NULL DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente','En preparación','Terminado')),
  requiere_firma boolean NOT NULL DEFAULT false,
  firmante text,
  fecha_limite_interna date,
  fecha_limite_oficial date,
  observaciones text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subvencion_documentos TO authenticated;
GRANT ALL ON public.subvencion_documentos TO service_role;
ALTER TABLE public.subvencion_documentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subvencion documentos admin" ON public.subvencion_documentos FOR ALL TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

CREATE TABLE public.subvencion_tareas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subvencion_id uuid NOT NULL REFERENCES public.oportunidades_subvenciones(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  responsable_person_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  fecha_limite date,
  dependencia_id uuid REFERENCES public.subvencion_tareas(id) ON DELETE SET NULL,
  estado text NOT NULL DEFAULT 'Pendiente',
  documento_id uuid REFERENCES public.subvencion_documentos(id) ON DELETE SET NULL,
  prioridad text NOT NULL DEFAULT 'Media',
  action_id uuid REFERENCES public.actions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subvencion_tareas TO authenticated;
GRANT ALL ON public.subvencion_tareas TO service_role;
ALTER TABLE public.subvencion_tareas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subvencion tareas admin" ON public.subvencion_tareas FOR ALL TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

CREATE TABLE public.subvencion_versiones_presentacion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subvencion_id uuid NOT NULL REFERENCES public.oportunidades_subvenciones(id) ON DELETE CASCADE,
  version integer NOT NULL,
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subvencion_id, version)
);
GRANT SELECT ON public.subvencion_versiones_presentacion TO authenticated;
GRANT ALL ON public.subvencion_versiones_presentacion TO service_role;
ALTER TABLE public.subvencion_versiones_presentacion ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subvencion versiones admin read" ON public.subvencion_versiones_presentacion FOR SELECT TO authenticated USING (public.current_user_is_admin());

ALTER TABLE public.ic_budget_lines
  ADD COLUMN source_grant_id uuid REFERENCES public.oportunidades_subvenciones(id) ON DELETE SET NULL,
  ADD COLUMN source_grant_line_id uuid UNIQUE REFERENCES public.subvencion_partidas(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.sync_subvencion_hito()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _event_id uuid; _grant_name text;
BEGIN
  IF TG_OP='DELETE' THEN
    IF OLD.calendar_event_id IS NOT NULL THEN DELETE FROM public.calendar_events WHERE id=OLD.calendar_event_id; END IF;
    RETURN OLD;
  END IF;
  SELECT nombre_corto INTO _grant_name FROM public.oportunidades_subvenciones WHERE id=NEW.subvencion_id;
  IF NEW.fecha_interna IS NULL THEN
    IF NEW.calendar_event_id IS NOT NULL THEN DELETE FROM public.calendar_events WHERE id=NEW.calendar_event_id; END IF;
    NEW.calendar_event_id := NULL;
    RETURN NEW;
  END IF;
  IF NEW.calendar_event_id IS NULL THEN
    INSERT INTO public.calendar_events(subject_type,subject_id,kind,title,note,start_date,end_date,calendar_category,assignee_person_id,source_kind)
    VALUES('grant',NEW.subvencion_id,'hito_subvencion',NEW.nombre || ' · ' || coalesce(_grant_name,'Subvención'),'/oportunidades/subvenciones/' || NEW.subvencion_id::text,NEW.fecha_interna,NEW.fecha_interna,'legal',NEW.responsable_person_id,'grant_milestone') RETURNING id INTO _event_id;
    NEW.calendar_event_id := _event_id;
  ELSE
    UPDATE public.calendar_events SET title=NEW.nombre || ' · ' || coalesce(_grant_name,'Subvención'), start_date=NEW.fecha_interna,end_date=NEW.fecha_interna,assignee_person_id=NEW.responsable_person_id,updated_at=now() WHERE id=NEW.calendar_event_id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER subvencion_hitos_sync BEFORE INSERT OR UPDATE OR DELETE ON public.subvencion_hitos FOR EACH ROW EXECUTE FUNCTION public.sync_subvencion_hito();

CREATE OR REPLACE FUNCTION public.snapshot_subvencion_presentada()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _version integer;
BEGIN
  IF NEW.estado='Presentada' AND OLD.estado IS DISTINCT FROM 'Presentada' THEN
    SELECT coalesce(max(version),0)+1 INTO _version FROM public.subvencion_versiones_presentacion WHERE subvencion_id=NEW.id;
    INSERT INTO public.subvencion_versiones_presentacion(subvencion_id,version,snapshot)
    SELECT NEW.id,_version,jsonb_build_object(
      'subvencion',to_jsonb(NEW),
      'partidas',coalesce((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.created_at) FROM public.subvencion_partidas p WHERE p.subvencion_id=NEW.id),'[]'::jsonb),
      'documentos',coalesce((SELECT jsonb_agg(to_jsonb(d) ORDER BY d.created_at) FROM public.subvencion_documentos d WHERE d.subvencion_id=NEW.id),'[]'::jsonb)
    );
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER subvencion_snapshot_presentada AFTER UPDATE OF estado ON public.oportunidades_subvenciones FOR EACH ROW EXECUTE FUNCTION public.snapshot_subvencion_presentada();

CREATE OR REPLACE FUNCTION public.touch_subvencion_children() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
CREATE TRIGGER subvencion_partidas_touch BEFORE UPDATE ON public.subvencion_partidas FOR EACH ROW EXECUTE FUNCTION public.touch_subvencion_children();
CREATE TRIGGER subvencion_hitos_touch BEFORE UPDATE ON public.subvencion_hitos FOR EACH ROW EXECUTE FUNCTION public.touch_subvencion_children();
CREATE TRIGGER subvencion_documentos_touch BEFORE UPDATE ON public.subvencion_documentos FOR EACH ROW EXECUTE FUNCTION public.touch_subvencion_children();
CREATE TRIGGER subvencion_tareas_touch BEFORE UPDATE ON public.subvencion_tareas FOR EACH ROW EXECUTE FUNCTION public.touch_subvencion_children();

CREATE POLICY "grant documents admin read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='grant-documents' AND public.current_user_is_admin());
CREATE POLICY "grant documents admin insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='grant-documents' AND public.current_user_is_admin());
CREATE POLICY "grant documents admin update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id='grant-documents' AND public.current_user_is_admin()) WITH CHECK (bucket_id='grant-documents' AND public.current_user_is_admin());
CREATE POLICY "grant documents admin delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='grant-documents' AND public.current_user_is_admin());