ALTER TABLE public.productions
  ADD COLUMN IF NOT EXISTS referido_por_composer_id uuid REFERENCES public.composers(id) ON DELETE SET NULL;

ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS referido_por_composer_id uuid REFERENCES public.composers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_productions_referido_por ON public.productions(referido_por_composer_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_referido_por ON public.opportunities(referido_por_composer_id);