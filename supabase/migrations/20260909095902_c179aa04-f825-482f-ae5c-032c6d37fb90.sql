ALTER TABLE public.production_phases
  ADD COLUMN IF NOT EXISTS owner text NOT NULL DEFAULT 'agencia';

ALTER TABLE public.production_phases
  DROP CONSTRAINT IF EXISTS production_phases_owner_check;

ALTER TABLE public.production_phases
  ADD CONSTRAINT production_phases_owner_check
  CHECK (owner IN ('agencia','representado','productora'));