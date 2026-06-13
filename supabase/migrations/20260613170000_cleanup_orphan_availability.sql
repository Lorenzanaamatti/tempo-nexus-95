-- Remove composer_availability rows referencing deleted composers, and add FK cascade
DELETE FROM public.composer_availability a
WHERE NOT EXISTS (SELECT 1 FROM public.composers c WHERE c.id = a.composer_id);

ALTER TABLE public.composer_availability
  DROP CONSTRAINT IF EXISTS composer_availability_composer_id_fkey;

ALTER TABLE public.composer_availability
  ADD CONSTRAINT composer_availability_composer_id_fkey
  FOREIGN KEY (composer_id) REFERENCES public.composers(id) ON DELETE CASCADE;
