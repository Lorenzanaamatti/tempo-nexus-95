ALTER TABLE public.production_assignments DROP CONSTRAINT production_assignments_one_subject;
ALTER TABLE public.production_assignments ADD CONSTRAINT production_assignments_one_subject CHECK (
  (CASE WHEN composer_id IS NOT NULL THEN 1 ELSE 0 END
 + CASE WHEN person_id IS NOT NULL THEN 1 ELSE 0 END
 + CASE WHEN partner_company_id IS NOT NULL THEN 1 ELSE 0 END
 + CASE WHEN nullif(btrim(external_name), '') IS NOT NULL THEN 1 ELSE 0 END) = 1) NOT VALID;