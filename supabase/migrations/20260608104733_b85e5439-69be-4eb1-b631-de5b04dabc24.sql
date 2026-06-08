
ALTER TABLE public.composer_team_assignments
  ADD COLUMN IF NOT EXISTS ic_function public.ic_team_function;

ALTER TABLE public.composer_team_assignments
  ALTER COLUMN team_role DROP NOT NULL;
