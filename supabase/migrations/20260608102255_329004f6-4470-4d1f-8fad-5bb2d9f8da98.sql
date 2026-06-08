
-- ENUMs
CREATE TYPE public.deal_memo_estado AS ENUM (
  'borrador','generando','revision_interna','corrigiendo','revision_final',
  'enviado','respondido','cerrado','cancelado'
);
CREATE TYPE public.dm_contacto_tipo AS ENUM ('interno','cliente','contraparte','validador');
CREATE TYPE public.dm_version_origen AS ENUM ('agente_ia','correccion_humana');
CREATE TYPE public.dm_evento_tipo AS ENUM (
  'creado','version_generada','enviado_a_revisor_interno','aprobado_revisor_interno',
  'correcciones_solicitadas','enviado_a_validador_final','aprobado_final',
  'enviado_a_destinatario','respuesta_recibida','reminder_enviado','cerrado'
);

-- ============== dm_contactos ==============
CREATE TABLE public.dm_contactos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  tipo public.dm_contacto_tipo NOT NULL,
  rol TEXT,
  empresa TEXT,
  notas TEXT
);
CREATE INDEX idx_dm_contactos_tipo ON public.dm_contactos(tipo);
CREATE INDEX idx_dm_contactos_email ON public.dm_contactos(email);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dm_contactos TO authenticated;
GRANT ALL ON public.dm_contactos TO service_role;
ALTER TABLE public.dm_contactos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_dm_contactos" ON public.dm_contactos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_dm_contactos_touch BEFORE UPDATE ON public.dm_contactos
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============== dm_plantillas ==============
CREATE TABLE public.dm_plantillas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  email_asunto_template TEXT NOT NULL,
  email_cuerpo_template TEXT NOT NULL,
  email_firma TEXT NOT NULL,
  word_template_url TEXT,
  instrucciones_para_agente TEXT NOT NULL,
  activa BOOLEAN NOT NULL DEFAULT true
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dm_plantillas TO authenticated;
GRANT ALL ON public.dm_plantillas TO service_role;
ALTER TABLE public.dm_plantillas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_dm_plantillas" ON public.dm_plantillas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_dm_plantillas_touch BEFORE UPDATE ON public.dm_plantillas
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============== deal_memos ==============
CREATE TABLE public.deal_memos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  referencia TEXT UNIQUE NOT NULL,
  cliente_id UUID REFERENCES public.dm_contactos(id) ON DELETE SET NULL,
  contraparte_id UUID REFERENCES public.dm_contactos(id) ON DELETE SET NULL,
  obra TEXT NOT NULL,
  descripcion_uso TEXT,
  importe_propuesto NUMERIC(12,2),
  moneda TEXT NOT NULL DEFAULT 'EUR',
  plantilla_id UUID REFERENCES public.dm_plantillas(id) ON DELETE SET NULL,
  validador_interno_id UUID REFERENCES public.dm_contactos(id) ON DELETE SET NULL,
  validador_final_id UUID REFERENCES public.dm_contactos(id) ON DELETE SET NULL,
  destinatario_final_email TEXT NOT NULL,
  estado public.deal_memo_estado NOT NULL DEFAULT 'borrador',
  plazo_respuesta_dias INTEGER NOT NULL DEFAULT 7,
  fecha_envio TIMESTAMPTZ,
  fecha_limite_respuesta TIMESTAMPTZ,
  google_calendar_event_id TEXT,
  google_calendar_reminder_event_id TEXT,
  notas_internas TEXT
);
CREATE INDEX idx_deal_memos_estado ON public.deal_memos(estado);
CREATE INDEX idx_deal_memos_referencia ON public.deal_memos(referencia);
CREATE INDEX idx_deal_memos_fecha_envio ON public.deal_memos(fecha_envio);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.deal_memos TO authenticated;
GRANT ALL ON public.deal_memos TO service_role;
ALTER TABLE public.deal_memos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_deal_memos" ON public.deal_memos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_deal_memos_touch BEFORE UPDATE ON public.deal_memos
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============== deal_memo_versiones ==============
CREATE TABLE public.deal_memo_versiones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deal_memo_id UUID NOT NULL REFERENCES public.deal_memos(id) ON DELETE CASCADE,
  numero_version INTEGER NOT NULL,
  email_asunto TEXT NOT NULL,
  email_cuerpo TEXT NOT NULL,
  word_file_url TEXT,
  generada_por public.dm_version_origen NOT NULL,
  comentarios_revision TEXT,
  UNIQUE(deal_memo_id, numero_version)
);
CREATE INDEX idx_dm_versiones_deal_memo ON public.deal_memo_versiones(deal_memo_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.deal_memo_versiones TO authenticated;
GRANT ALL ON public.deal_memo_versiones TO service_role;
ALTER TABLE public.deal_memo_versiones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_dm_versiones" ON public.deal_memo_versiones
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============== deal_memo_eventos ==============
CREATE TABLE public.deal_memo_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deal_memo_id UUID NOT NULL REFERENCES public.deal_memos(id) ON DELETE CASCADE,
  tipo_evento public.dm_evento_tipo NOT NULL,
  actor_email TEXT,
  payload JSONB
);
CREATE INDEX idx_dm_eventos_deal_memo ON public.deal_memo_eventos(deal_memo_id);
CREATE INDEX idx_dm_eventos_tipo ON public.deal_memo_eventos(tipo_evento);
CREATE INDEX idx_dm_eventos_created_at ON public.deal_memo_eventos(created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.deal_memo_eventos TO authenticated;
GRANT ALL ON public.deal_memo_eventos TO service_role;
ALTER TABLE public.deal_memo_eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_dm_eventos" ON public.deal_memo_eventos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
