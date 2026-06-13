CREATE OR REPLACE FUNCTION public.sync_composer_to_people()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- La compañía no es una persona; no crear/sincronizar fila en people.
  IF NEW.roster_role = 'ic_company'::roster_role THEN
    RETURN NEW;
  END IF;

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