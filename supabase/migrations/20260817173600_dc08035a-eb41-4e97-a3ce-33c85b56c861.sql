CREATE TYPE public.roster_prospect_estado AS ENUM ('contactado','reunion_mantenida','oferta_enviada','aceptado','rechazado_ic','rechazado_compositor');
CREATE TYPE public.intl_prospect_tipo AS ENUM ('productora','plataforma','supervisor_musical','otro');
CREATE TYPE public.intl_propuesta_estado AS ENUM ('sin_propuesta','propuesta_enviada','aceptada','rechazada','en_curso');
CREATE TYPE public.marketing_campaign_canal AS ENUM ('instagram','linkedin','prensa','festival','publicidad_pagada','email','otro');

CREATE TABLE public.empresa_objetivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anio integer NOT NULL,
  metrica text NOT NULL,
  valor_objetivo numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (anio, metrica)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.empresa_objetivos TO authenticated;
GRANT ALL ON public.empresa_objetivos TO service_role;
ALTER TABLE public.empresa_objetivos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "empresa_objetivos_bigc" ON public.empresa_objetivos FOR ALL TO authenticated USING (public.current_user_is_big_c()) WITH CHECK (public.current_user_is_big_c());
CREATE TRIGGER empresa_objetivos_touch BEFORE UPDATE ON public.empresa_objetivos FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.roster_prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  fecha_primer_contacto date NOT NULL DEFAULT current_date,
  estado public.roster_prospect_estado NOT NULL DEFAULT 'contactado',
  notas text,
  fecha_decision date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roster_prospects TO authenticated;
GRANT ALL ON public.roster_prospects TO service_role;
ALTER TABLE public.roster_prospects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roster_prospects_bigc" ON public.roster_prospects FOR ALL TO authenticated USING (public.current_user_is_big_c()) WITH CHECK (public.current_user_is_big_c());
CREATE TRIGGER roster_prospects_touch BEFORE UPDATE ON public.roster_prospects FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.international_prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_empresa text NOT NULL,
  pais text,
  fecha_primer_contacto date NOT NULL DEFAULT current_date,
  tipo public.intl_prospect_tipo NOT NULL DEFAULT 'productora',
  reuniones_mantenidas integer NOT NULL DEFAULT 0,
  estado_propuesta public.intl_propuesta_estado NOT NULL DEFAULT 'sin_propuesta',
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.international_prospects TO authenticated;
GRANT ALL ON public.international_prospects TO service_role;
ALTER TABLE public.international_prospects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "international_prospects_bigc" ON public.international_prospects FOR ALL TO authenticated USING (public.current_user_is_big_c()) WITH CHECK (public.current_user_is_big_c());
CREATE TRIGGER international_prospects_touch BEFORE UPDATE ON public.international_prospects FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.marketing_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  fecha_inicio date,
  fecha_fin date,
  canal public.marketing_campaign_canal NOT NULL DEFAULT 'otro',
  presupuesto_asignado numeric NOT NULL DEFAULT 0,
  gasto_real numeric NOT NULL DEFAULT 0,
  alcance integer NOT NULL DEFAULT 0,
  impresiones integer NOT NULL DEFAULT 0,
  engagement integer NOT NULL DEFAULT 0,
  leads_generados integer NOT NULL DEFAULT 0,
  conversiones integer NOT NULL DEFAULT 0,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_campaigns TO authenticated;
GRANT ALL ON public.marketing_campaigns TO service_role;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "marketing_campaigns_bigc" ON public.marketing_campaigns FOR ALL TO authenticated USING (public.current_user_is_big_c()) WITH CHECK (public.current_user_is_big_c());
CREATE TRIGGER marketing_campaigns_touch BEFORE UPDATE ON public.marketing_campaigns FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();