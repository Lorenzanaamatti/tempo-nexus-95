-- Etiquetas de estilo a nivel de pista (demo)
-- 1) Set fino de etiquetas por pista: array de texto libre sobre composer_demos
ALTER TABLE public.composer_demos
  ADD COLUMN IF NOT EXISTS style_tags text[] NOT NULL DEFAULT '{}'::text[];

COMMENT ON COLUMN public.composer_demos.style_tags IS 'Etiquetas finas de estilo de la pista (ánimo, textura, tempo, tono, uso). Set libre, editable por quien puede editar la demo.';

-- 2) Vínculo de la pista con el catálogo de estilos de la app (music_styles)
CREATE TABLE public.composer_demo_styles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demo_id uuid NOT NULL REFERENCES public.composer_demos(id) ON DELETE CASCADE,
  composer_id uuid NOT NULL REFERENCES public.composers(id) ON DELETE CASCADE,
  style_id uuid NOT NULL REFERENCES public.music_styles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (demo_id, style_id)
);

COMMENT ON TABLE public.composer_demo_styles IS 'Estilos del catálogo de la app asignados a una pista concreta (demo). composer_id se repite a propósito para poder filtrar y validar permisos igual que en composer_styles.';

CREATE INDEX IF NOT EXISTS composer_demo_styles_demo_id_idx ON public.composer_demo_styles (demo_id);
CREATE INDEX IF NOT EXISTS composer_demo_styles_composer_id_idx ON public.composer_demo_styles (composer_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.composer_demo_styles TO authenticated;
GRANT ALL ON public.composer_demo_styles TO service_role;

ALTER TABLE public.composer_demo_styles ENABLE ROW LEVEL SECURITY;

-- Quien puede ver la demo del compositor puede ver sus estilos
CREATE POLICY "composer_demo_styles read"
  ON public.composer_demo_styles
  FOR SELECT
  TO authenticated
  USING (public.can_access_composer(composer_id));

-- Quien puede editar la demo puede cambiar sus estilos (misma regla que composer_demos)
CREATE POLICY "composer_demo_styles write"
  ON public.composer_demo_styles
  FOR ALL
  TO authenticated
  USING (public.can_access_composer(composer_id))
  WITH CHECK (public.can_access_composer(composer_id));