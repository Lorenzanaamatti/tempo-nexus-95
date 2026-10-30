CREATE OR REPLACE FUNCTION public.production_change_log_fill()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _name text;
BEGIN
  NEW.changed_by := auth.uid();
  NEW.changed_at := now();
  SELECT coalesce(
      (SELECT nullif(trim(full_name), '') FROM public.people WHERE user_id = u.id AND coalesce(trim(full_name), '') <> '' LIMIT 1),
      (SELECT nullif(trim(full_name), '') FROM public.people WHERE lower(email) = lower(u.email) AND coalesce(trim(full_name), '') <> '' LIMIT 1),
      (SELECT nullif(trim(display_name), '') FROM public.profiles WHERE id = u.id),
      split_part(u.email, '@', 1))
    INTO _name
  FROM auth.users u WHERE u.id = auth.uid();
  NEW.changed_by_initials := upper(coalesce(
    (SELECT string_agg(left(w, 1), '') FROM unnest(regexp_split_to_array(trim(coalesce(_name, '?')), '[\s._-]+')) w WHERE w <> ''),
    '?'));
  RETURN NEW;
END $$;