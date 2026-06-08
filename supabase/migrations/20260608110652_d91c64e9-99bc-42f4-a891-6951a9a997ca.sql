
ALTER TABLE public.production_assignments
  ADD COLUMN IF NOT EXISTS composer_id uuid REFERENCES public.composers(id) ON DELETE CASCADE;

ALTER TABLE public.production_assignments
  ALTER COLUMN person_id DROP NOT NULL;

ALTER TABLE public.production_assignments
  DROP CONSTRAINT IF EXISTS production_assignments_subject_chk;

ALTER TABLE public.production_assignments
  ADD CONSTRAINT production_assignments_subject_chk
  CHECK ((person_id IS NOT NULL)::int + (composer_id IS NOT NULL)::int = 1);

CREATE INDEX IF NOT EXISTS prod_assign_composer_idx ON public.production_assignments(composer_id);
