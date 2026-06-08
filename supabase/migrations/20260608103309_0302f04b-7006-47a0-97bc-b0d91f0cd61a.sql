
CREATE TYPE public.ic_team_function AS ENUM (
  'equipo_virtual',
  'direccion_general',
  'agente',
  'produccion',
  'post_produccion',
  'legal',
  'legal_externo',
  'validacion_contratos_deal_memos',
  'onboarding_clientes',
  'discografica',
  'editorial',
  'ai_reminder',
  'ai_deal_memos',
  'ai_contratos',
  'ai_facturacion',
  'ai_cobros',
  'ai_calendarios_preavisos',
  'ai_control_agentes_ai',
  'administracion',
  'contabilidad',
  'fiscal',
  'pagos_y_cobros',
  'bancos_y_tesoreria',
  'facturacion',
  'diseno',
  'marketing',
  'comunicacion',
  'paid_media',
  'analytics',
  'prensa',
  'pr',
  'institucional',
  'editores',
  'sellos',
  'reels_background_av',
  'fotos_videos_clientes',
  'seguimiento_producciones'
);

CREATE TABLE public.person_ic_functions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  person_id uuid NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  function public.ic_team_function NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (person_id, function)
);

CREATE INDEX person_ic_functions_person_idx ON public.person_ic_functions(person_id);
CREATE INDEX person_ic_functions_function_idx ON public.person_ic_functions(function);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.person_ic_functions TO authenticated;
GRANT ALL ON public.person_ic_functions TO service_role;

ALTER TABLE public.person_ic_functions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "person_ic_functions read"
  ON public.person_ic_functions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "person_ic_functions admin write"
  ON public.person_ic_functions FOR ALL
  TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());
