-- Proveedores: catálogo compartido (estudios, mezcla, máster, músicos, copistas, abogados, etc.)
CREATE TYPE public.provider_kind AS ENUM (
  'estudio_grabacion',
  'mezcla',
  'mastering',
  'musico',
  'orquesta',
  'copista',
  'editor_musical',
  'sonido',
  'post_produccion',
  'abogado',
  'gestoria',
  'fotografo',
  'video',
  'diseno',
  'web',
  'pr_marketing',
  'otros'
);

CREATE TABLE public.providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind public.provider_kind NOT NULL DEFAULT 'otros',
  contact_name text,
  email text,
  phone text,
  website text,
  city text,
  country text,
  -- ámbito: IC, un representado concreto, o ambos (NULL = compartido global)
  composer_id uuid REFERENCES public.composers(id) ON DELETE CASCADE,
  shared_with_ic boolean NOT NULL DEFAULT true,
  rate_notes text,
  notes text,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX providers_kind_idx ON public.providers (kind);
CREATE INDEX providers_composer_idx ON public.providers (composer_id);
CREATE INDEX providers_name_idx ON public.providers (lower(name));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.providers TO authenticated;
GRANT ALL ON public.providers TO service_role;

ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;

-- Admin IC: acceso total
CREATE POLICY "Admins manage all providers"
ON public.providers
FOR ALL
TO authenticated
USING (public.current_user_is_admin())
WITH CHECK (public.current_user_is_admin());

-- Representado: ve los suyos + los compartidos globales
CREATE POLICY "Composers read own and shared providers"
ON public.providers
FOR SELECT
TO authenticated
USING (
  shared_with_ic = true
  OR (composer_id IS NOT NULL AND public.can_access_composer(composer_id))
);

CREATE POLICY "Composers manage own providers"
ON public.providers
FOR ALL
TO authenticated
USING (composer_id IS NOT NULL AND public.can_access_composer(composer_id))
WITH CHECK (composer_id IS NOT NULL AND public.can_access_composer(composer_id));

CREATE TRIGGER providers_touch_updated_at
BEFORE UPDATE ON public.providers
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
