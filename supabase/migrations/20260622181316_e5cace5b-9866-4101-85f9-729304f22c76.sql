
ALTER TABLE public.actions
  ALTER COLUMN subject_type DROP NOT NULL,
  ALTER COLUMN subject_id DROP NOT NULL;
