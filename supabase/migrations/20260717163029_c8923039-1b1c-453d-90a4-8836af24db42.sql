
CREATE OR REPLACE FUNCTION public.candidacies_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.candidacies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text,
  phone text,
  source text NOT NULL DEFAULT 'recibida',
  job_post_title text,
  message text,
  links jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'nueva',
  notes text,
  reviewer_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  promoted_composer_id uuid REFERENCES public.composers(id) ON DELETE SET NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidacies TO authenticated;
GRANT ALL ON public.candidacies TO service_role;

ALTER TABLE public.candidacies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage candidacies"
  ON public.candidacies
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'team'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'team'));

CREATE TRIGGER update_candidacies_updated_at
  BEFORE UPDATE ON public.candidacies
  FOR EACH ROW EXECUTE FUNCTION public.candidacies_touch_updated_at();

CREATE INDEX candidacies_status_idx ON public.candidacies(status);
CREATE INDEX candidacies_received_at_idx ON public.candidacies(received_at DESC);
