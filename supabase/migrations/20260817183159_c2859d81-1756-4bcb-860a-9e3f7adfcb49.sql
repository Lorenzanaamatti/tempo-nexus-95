CREATE TYPE public.prospeccion_estado AS ENUM ('sin_valorar','interesa_contactar','contactada','descartada');

CREATE TABLE public.producciones_espanolas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tmdb_id integer UNIQUE,
  media_type text NOT NULL DEFAULT 'movie',
  title text NOT NULL,
  title_original text,
  title_es text,
  year integer,
  release_date date,
  poster_path text,
  backdrop_path text,
  directors text[] NOT NULL DEFAULT '{}',
  production_companies text[] NOT NULL DEFAULT '{}',
  genres text[] NOT NULL DEFAULT '{}',
  runtime integer,
  platform text,
  countries text[] NOT NULL DEFAULT '{}',
  synopsis text,
  tmdb_url text,
  tmdb_status text,
  ic_participo boolean NOT NULL DEFAULT false,
  produccion_ic_vinculada uuid REFERENCES public.productions(id) ON DELETE SET NULL,
  representados_vinculados uuid[] NOT NULL DEFAULT '{}',
  estado_prospeccion public.prospeccion_estado NOT NULL DEFAULT 'sin_valorar',
  oportunidad_vinculada uuid REFERENCES public.opportunities(id) ON DELETE SET NULL,
  notas text,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.producciones_espanolas TO authenticated;
GRANT ALL ON public.producciones_espanolas TO service_role;

ALTER TABLE public.producciones_espanolas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "producciones_espanolas read" ON public.producciones_espanolas
  FOR SELECT TO authenticated USING (public.current_user_is_admin());

CREATE POLICY "producciones_espanolas write" ON public.producciones_espanolas
  FOR ALL TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

CREATE TRIGGER producciones_espanolas_touch
  BEFORE UPDATE ON public.producciones_espanolas
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX producciones_espanolas_year_idx ON public.producciones_espanolas (year DESC);
CREATE INDEX producciones_espanolas_ic_idx ON public.producciones_espanolas (ic_participo);