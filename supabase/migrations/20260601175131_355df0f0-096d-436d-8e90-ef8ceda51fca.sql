-- Unify roster (artists, supervisors, specialists, curators, other) into composers table with a role field

CREATE TYPE public.roster_role AS ENUM ('composer','artist','supervisor','specialist','curator','other');

ALTER TABLE public.composers
  ADD COLUMN roster_role public.roster_role NOT NULL DEFAULT 'composer';

CREATE INDEX idx_composers_roster_role ON public.composers(roster_role);

-- Map roster_role -> people.role (which already has all values)
CREATE OR REPLACE FUNCTION public.sync_composer_to_people()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.people (role, full_name, email, composer_id)
    VALUES (NEW.roster_role::text::person_role, NEW.full_name, NEW.email, NEW.id)
    ON CONFLICT (composer_id) DO NOTHING;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.people
       SET full_name = NEW.full_name,
           email = NEW.email,
           role = NEW.roster_role::text::person_role,
           updated_at = now()
     WHERE composer_id = NEW.id;
  END IF;
  RETURN NEW;
END; $function$;