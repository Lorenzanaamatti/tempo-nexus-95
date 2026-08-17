CREATE TYPE public.prensa_iniciativa AS ENUM ('Reactiva', 'Proactiva', 'Autocandidatura');

CREATE TABLE public.oportunidades_prensa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  iniciativa public.prensa_iniciativa NOT NULL DEFAULT 'Proactiva',
  medio_vinculado uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  medios_destinatarios text,
  representado_vinculado uuid REFERENCES public.composers(id) ON DELETE SET NULL,
  produccion_vinculada uuid REFERENCES public.productions(id) ON DELETE SET NULL,
  tipo text,
  ambito text,
  fecha_deadline date,
  fecha_publicacion_prevista date,
  estado text NOT NULL DEFAULT 'Identificada',
  url text,
  resultado_notas text,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.oportunidades_prensa TO authenticated;
GRANT ALL ON public.oportunidades_prensa TO service_role;

ALTER TABLE public.oportunidades_prensa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can view press opportunities"
  ON public.oportunidades_prensa FOR SELECT TO authenticated USING (true);

CREATE POLICY "Team can manage press opportunities"
  ON public.oportunidades_prensa FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER oportunidades_prensa_touch
  BEFORE UPDATE ON public.oportunidades_prensa
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.oportunidades_prensa_validate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.iniciativa <> 'Autocandidatura' AND NEW.medio_vinculado IS NULL THEN
    RAISE EXCEPTION 'El medio vinculado es obligatorio salvo en autocandidaturas';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER oportunidades_prensa_validate_trg
  BEFORE INSERT OR UPDATE ON public.oportunidades_prensa
  FOR EACH ROW EXECUTE FUNCTION public.oportunidades_prensa_validate();

CREATE INDEX oportunidades_prensa_deadline_idx ON public.oportunidades_prensa (fecha_deadline);