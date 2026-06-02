
-- Production type enum
DO $$ BEGIN
  CREATE TYPE public.production_kind AS ENUM ('cine','serie','plataforma','publicidad','videojuego','documental');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Production status enum
DO $$ BEGIN
  CREATE TYPE public.production_status AS ENUM (
    'pitch_enviado','negociacion','contrato_firmado',
    'fechas_rodaje','fechas_montaje','entrega_visuales',
    'corte_intermedio_1','corte_intermedio_2','corte_intermedio_3',
    'entrega_musica','mezclas',
    'sprint_1','sprint_2','sprint_3','sprint_4','sprint_5','sprint_6',
    'facturado','cobrado'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extend productions
ALTER TABLE public.productions
  ADD COLUMN IF NOT EXISTS project_type public.production_kind,
  ADD COLUMN IF NOT EXISTS composer_id uuid,
  ADD COLUMN IF NOT EXISTS partner text,
  ADD COLUMN IF NOT EXISTS status public.production_status,
  ADD COLUMN IF NOT EXISTS fee_amount numeric,
  ADD COLUMN IF NOT EXISTS ic_commission numeric,
  ADD COLUMN IF NOT EXISTS delivery_date date,
  ADD COLUMN IF NOT EXISTS negotiator_person_id uuid;

CREATE INDEX IF NOT EXISTS idx_productions_composer ON public.productions(composer_id);
CREATE INDEX IF NOT EXISTS idx_productions_negotiator ON public.productions(negotiator_person_id);

-- production_documents table
CREATE TABLE IF NOT EXISTS public.production_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_id uuid NOT NULL,
  title text NOT NULL,
  kind text,
  notes text,
  url text,
  storage_path text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_documents TO authenticated;
GRANT ALL ON public.production_documents TO service_role;

ALTER TABLE public.production_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prod_documents read" ON public.production_documents
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "prod_documents admin write" ON public.production_documents
  FOR ALL TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

CREATE INDEX IF NOT EXISTS idx_prod_documents_prod ON public.production_documents(production_id);
