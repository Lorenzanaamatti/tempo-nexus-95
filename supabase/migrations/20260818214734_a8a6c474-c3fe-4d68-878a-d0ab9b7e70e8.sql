-- 1. Partners: allow team members to write (previously admin-only → silent no-op updates)
DROP POLICY IF EXISTS "partners admin write" ON public.partners;
DROP POLICY IF EXISTS "partners read" ON public.partners;
CREATE POLICY "partners read" ON public.partners FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'team'));
CREATE POLICY "partners write" ON public.partners FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'team'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'team'));

-- 2. Pitches
CREATE TABLE IF NOT EXISTS public.oportunidades_pitches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  partner_destinatario uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  proyecto_vinculado text,
  produccion_id uuid REFERENCES public.productions(id) ON DELETE SET NULL,
  tipo text NOT NULL DEFAULT 'Música original',
  fecha_pitch date,
  estado text NOT NULL DEFAULT 'En preparación',
  presupuesto_estimado numeric,
  fecha_seguimiento date,
  responsable_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.oportunidades_pitches TO authenticated;
GRANT ALL ON public.oportunidades_pitches TO service_role;
ALTER TABLE public.oportunidades_pitches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pitches read" ON public.oportunidades_pitches FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'team'));
CREATE POLICY "pitches write" ON public.oportunidades_pitches FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'team'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'team'));
CREATE TRIGGER oportunidades_pitches_touch BEFORE UPDATE ON public.oportunidades_pitches
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.oportunidades_pitch_composers (
  pitch_id uuid NOT NULL REFERENCES public.oportunidades_pitches(id) ON DELETE CASCADE,
  composer_id uuid NOT NULL REFERENCES public.composers(id) ON DELETE CASCADE,
  PRIMARY KEY (pitch_id, composer_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.oportunidades_pitch_composers TO authenticated;
GRANT ALL ON public.oportunidades_pitch_composers TO service_role;
ALTER TABLE public.oportunidades_pitch_composers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pitch composers read" ON public.oportunidades_pitch_composers FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'team'));
CREATE POLICY "pitch composers write" ON public.oportunidades_pitch_composers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'team'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'team'));

-- 3. Production closure checklist
CREATE TABLE IF NOT EXISTS public.production_closures (
  production_id uuid PRIMARY KEY REFERENCES public.productions(id) ON DELETE CASCADE,
  presupuesto_ok boolean NOT NULL DEFAULT false,
  presupuesto_documento_id uuid,
  deal_memo_ok boolean NOT NULL DEFAULT false,
  deal_memo_id uuid REFERENCES public.deal_memos(id) ON DELETE SET NULL,
  contrato_ok boolean NOT NULL DEFAULT false,
  contrato_id uuid REFERENCES public.contracts(id) ON DELETE SET NULL,
  cue_sheet_ok boolean NOT NULL DEFAULT false,
  cue_sheet_enviada_a text,
  cue_sheet_fecha_envio date,
  cue_sheet_storage_path text,
  entregables_ok boolean NOT NULL DEFAULT false,
  entregables_descripcion text,
  entregables_fecha date,
  documento_cierre_ok boolean NOT NULL DEFAULT false,
  documento_cierre_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  cue_sheet_temas jsonb NOT NULL DEFAULT '[]'::jsonb,
  derechos_concedidos text,
  honorarios_finales numeric,
  notas_internas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_closures TO authenticated;
GRANT ALL ON public.production_closures TO service_role;
ALTER TABLE public.production_closures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "closures read" ON public.production_closures FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'team'));
CREATE POLICY "closures write" ON public.production_closures FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'team'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'team'));
CREATE TRIGGER production_closures_touch BEFORE UPDATE ON public.production_closures
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 4. Objetivos: nota opcional
ALTER TABLE public.empresa_objetivos ADD COLUMN IF NOT EXISTS nota text;