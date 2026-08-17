
CREATE TYPE public.partner_tipo AS ENUM ('Productora','Medio','Institución');
CREATE TYPE public.partner_ambito AS ENUM ('Local','Nacional','Internacional');

CREATE TABLE public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo public.partner_tipo NOT NULL DEFAULT 'Productora',
  subtipo text,
  tipo_apoyo text[] NOT NULL DEFAULT '{}',
  ambito public.partner_ambito,
  nombre text NOT NULL,
  pais text,
  ciudad text,
  contacto_principal text,
  contacto_email text,
  contacto_telefono text,
  website text,
  relacion_ic text,
  notas text,
  source_table text,
  source_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX partners_tipo_idx ON public.partners (tipo);
CREATE UNIQUE INDEX partners_source_idx ON public.partners (source_table, source_id) WHERE source_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partners TO authenticated;
GRANT ALL ON public.partners TO service_role;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "partners read" ON public.partners FOR SELECT TO authenticated USING (public.current_user_is_admin());
CREATE POLICY "partners admin write" ON public.partners FOR ALL TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

CREATE TRIGGER partners_touch BEFORE UPDATE ON public.partners FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.partners (id, tipo, subtipo, nombre, pais, ciudad, contacto_principal, contacto_email, contacto_telefono, website, notas, source_table, source_id)
SELECT pc.id, 'Productora', 'Productora de cine', pc.name, pc.country, pc.city, pc.contact_name, pc.email, pc.phone, pc.website, pc.notes, 'production_companies', pc.id
FROM public.production_companies pc
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.partners (id, tipo, subtipo, nombre, pais, contacto_principal, contacto_email, contacto_telefono, website, notas, source_table, source_id)
SELECT pl.id, 'Medio', 'Plataforma streaming', pl.name, pl.country, pl.contact_name, pl.email, pl.phone, pl.website, pl.notes, 'platforms', pl.id
FROM public.platforms pl
ON CONFLICT (id) DO NOTHING;
