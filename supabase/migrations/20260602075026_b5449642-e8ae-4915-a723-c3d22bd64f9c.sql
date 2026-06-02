
DO $$
DECLARE
  p RECORD;
  new_id uuid;
  base_slug text;
  final_slug text;
  n int;
BEGIN
  FOR p IN
    SELECT id, full_name, email, role
      FROM public.people
     WHERE composer_id IS NULL
       AND role::text IN ('composer','artist','supervisor','specialist','curator','other')
  LOOP
    base_slug := regexp_replace(lower(coalesce(p.full_name,'persona')), '[^a-z0-9]+', '-', 'g');
    base_slug := trim(both '-' from base_slug);
    IF base_slug = '' THEN base_slug := 'persona'; END IF;
    final_slug := base_slug;
    n := 1;
    WHILE EXISTS (SELECT 1 FROM public.composers WHERE slug = final_slug) LOOP
      n := n + 1;
      final_slug := base_slug || '-' || n::text;
    END LOOP;

    INSERT INTO public.composers (full_name, slug, roster_role, email)
    VALUES (p.full_name, final_slug, p.role::text::roster_role, p.email)
    RETURNING id INTO new_id;

    -- The sync trigger created a duplicate people row pointing to new_id.
    -- Remove it and link the original people row instead.
    DELETE FROM public.people WHERE composer_id = new_id AND id <> p.id;
    UPDATE public.people SET composer_id = new_id WHERE id = p.id;
  END LOOP;
END $$;
