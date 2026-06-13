ALTER TYPE public.roster_role ADD VALUE IF NOT EXISTS 'ic_company';

ALTER TABLE public.composers
  ADD COLUMN IF NOT EXISTS company_profile jsonb NOT NULL DEFAULT '{}'::jsonb;