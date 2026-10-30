ALTER TABLE public.production_assignments DROP CONSTRAINT production_assignments_subject_chk;
ALTER TABLE public.production_assignments ADD CONSTRAINT production_assignments_subject_chk CHECK (
  ((person_id IS NOT NULL)::int + (composer_id IS NOT NULL)::int + (nullif(btrim(external_name), '') IS NOT NULL)::int) = 1) NOT VALID;