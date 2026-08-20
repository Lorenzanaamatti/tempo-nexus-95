ALTER TYPE public.roster_role ADD VALUE IF NOT EXISTS 'productor_musical';
ALTER TYPE public.person_role ADD VALUE IF NOT EXISTS 'productor_musical';
ALTER TABLE public.composers ADD COLUMN IF NOT EXISTS role_subtype text;