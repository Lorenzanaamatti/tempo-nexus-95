
-- ENUM for opportunity status (still useful for validation; we'll store as text[])
DO $$ BEGIN
  CREATE TYPE public.opportunity_status AS ENUM (
    'identificado','primer_contacto','propuesta_enviada','negociacion','cerrado','descartado'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Main opportunities table
CREATE TABLE IF NOT EXISTS public.opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  partner_company_id uuid REFERENCES public.production_companies(id) ON DELETE SET NULL,
  partner_name text,
  statuses opportunity_status[] NOT NULL DEFAULT '{identificado}',
  probability_pct numeric,
  estimated_value numeric,
  responsible_person_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunities TO authenticated;
GRANT ALL ON public.opportunities TO service_role;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "opportunities read" ON public.opportunities FOR SELECT TO authenticated USING (true);
CREATE POLICY "opportunities admin write" ON public.opportunities FOR ALL TO authenticated
  USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());

CREATE TRIGGER trg_opportunities_updated_at BEFORE UPDATE ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Candidates (representados) — many-to-many
CREATE TABLE IF NOT EXISTS public.opportunity_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  composer_id uuid NOT NULL REFERENCES public.composers(id) ON DELETE CASCADE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (opportunity_id, composer_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunity_candidates TO authenticated;
GRANT ALL ON public.opportunity_candidates TO service_role;
ALTER TABLE public.opportunity_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "opp_candidates read" ON public.opportunity_candidates FOR SELECT TO authenticated USING (true);
CREATE POLICY "opp_candidates admin write" ON public.opportunity_candidates FOR ALL TO authenticated
  USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());

-- Actions (próximas acciones, acumulable con calendario)
CREATE TABLE IF NOT EXISTS public.opportunity_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  due_date date,
  title text NOT NULL,
  notes text,
  done boolean NOT NULL DEFAULT false,
  done_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunity_actions TO authenticated;
GRANT ALL ON public.opportunity_actions TO service_role;
ALTER TABLE public.opportunity_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "opp_actions read" ON public.opportunity_actions FOR SELECT TO authenticated USING (true);
CREATE POLICY "opp_actions admin write" ON public.opportunity_actions FOR ALL TO authenticated
  USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());

CREATE TRIGGER trg_opportunity_actions_updated_at BEFORE UPDATE ON public.opportunity_actions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
