CREATE TABLE public.production_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_id uuid NOT NULL REFERENCES public.productions(id) ON DELETE CASCADE,
  phase_id uuid,
  subject text NOT NULL,
  field text NOT NULL,
  old_value text,
  new_value text,
  reason text NOT NULL,
  also_applied_to text,
  changed_by uuid DEFAULT auth.uid(),
  changed_by_initials text,
  changed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.production_change_log TO authenticated;
GRANT ALL ON public.production_change_log TO service_role;
ALTER TABLE public.production_change_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read change log" ON public.production_change_log FOR SELECT TO authenticated USING (public.current_user_is_staff());
CREATE POLICY "staff insert change log" ON public.production_change_log FOR INSERT TO authenticated WITH CHECK (public.current_user_is_staff() AND changed_by = auth.uid());
CREATE INDEX production_change_log_prod_idx ON public.production_change_log(production_id, changed_at DESC);

CREATE OR REPLACE FUNCTION public.production_change_log_fill()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _name text;
BEGIN
  NEW.changed_by := auth.uid();
  NEW.changed_at := now();
  SELECT coalesce(nullif(trim(pe.full_name), ''), nullif(trim(pr.display_name), ''), split_part(u.email, '@', 1))
    INTO _name
  FROM auth.users u
  LEFT JOIN public.profiles pr ON pr.id = u.id
  LEFT JOIN public.people pe ON lower(pe.email) = lower(u.email)
  WHERE u.id = auth.uid()
  LIMIT 1;
  NEW.changed_by_initials := upper(coalesce(
    (SELECT string_agg(left(w, 1), '') FROM unnest(regexp_split_to_array(trim(coalesce(_name, '?')), '[\s._-]+')) w WHERE w <> ''),
    '?'));
  RETURN NEW;
END $$;
CREATE TRIGGER production_change_log_fill BEFORE INSERT ON public.production_change_log
FOR EACH ROW EXECUTE FUNCTION public.production_change_log_fill();