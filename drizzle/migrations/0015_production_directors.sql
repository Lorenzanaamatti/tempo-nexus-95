-- Varias directoras/es por producción: tabla de vínculo producción ↔ dirección.
-- Aditiva: no se toca ni se borra nada existente; productions.director_id sigue siendo la dirección principal.
CREATE TABLE public.production_directors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_id uuid NOT NULL REFERENCES public.productions(id) ON DELETE CASCADE,
  director_id uuid NOT NULL REFERENCES public.directors(id) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT production_directors_unique UNIQUE (production_id, director_id)
);

CREATE INDEX production_directors_director_idx ON public.production_directors (director_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_directors TO authenticated;
GRANT ALL ON public.production_directors TO service_role;

ALTER TABLE public.production_directors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "production directors staff read" ON public.production_directors
  FOR SELECT TO authenticated
  USING (
    public.current_user_is_staff()
    OR EXISTS (
      SELECT 1 FROM public.productions p
      WHERE p.id = production_directors.production_id
        AND p.composer_id IS NOT NULL
        AND public.can_access_composer(p.composer_id)
    )
  );

CREATE POLICY "production directors staff write" ON public.production_directors
  FOR ALL TO authenticated
  USING (public.current_user_is_staff())
  WITH CHECK (public.current_user_is_staff());

-- Backfill: la dirección principal ya registrada pasa a la tabla de vínculo.
INSERT INTO public.production_directors (production_id, director_id, is_primary)
SELECT id, director_id, true
FROM public.productions
WHERE director_id IS NOT NULL
ON CONFLICT (production_id, director_id) DO NOTHING;