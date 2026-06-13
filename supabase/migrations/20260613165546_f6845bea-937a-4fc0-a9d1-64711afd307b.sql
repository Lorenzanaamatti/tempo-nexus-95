-- 1. Add 'team' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'team';

-- 2. Add status column to profiles
DO $$ BEGIN
  CREATE TYPE public.profile_status AS ENUM ('pending','active','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status public.profile_status NOT NULL DEFAULT 'pending';

-- Existing profiles -> active so they don't lose access
UPDATE public.profiles SET status = 'active' WHERE status = 'pending';

-- 3. Helper: is current user BIG C (admin)
CREATE OR REPLACE FUNCTION public.current_user_is_big_c()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$ SELECT public.has_role(auth.uid(), 'admin') $$;

-- 4. Update handle_new_user: keep auto-link for roster and first-admin,
--    but other new users go to pending status with no role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
declare
  _is_first boolean;
  _composer_id uuid;
  _status public.profile_status := 'pending';
begin
  select id into _composer_id
    from public.composers
   where lower(coalesce(nullif(owner_email,''), nullif(email,''))) = lower(new.email)
   limit 1;

  select not exists (select 1 from public.user_roles where role = 'admin') into _is_first;

  -- First user ever, or auto-linked roster composer -> active
  if _is_first or _composer_id is not null then
    _status := 'active';
  end if;

  insert into public.profiles (id, display_name, avatar_url, composer_id, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    _composer_id,
    _status
  )
  on conflict (id) do update set composer_id = coalesce(public.profiles.composer_id, excluded.composer_id);

  if _is_first then
    insert into public.user_roles (user_id, role) values (new.id, 'admin') on conflict do nothing;
  end if;

  if _composer_id is not null then
    update public.composers set owner_user_id = new.id where id = _composer_id and owner_user_id is null;
    insert into public.user_roles (user_id, role) values (new.id, 'composer') on conflict do nothing;
  end if;

  return new;
end;
$function$;

-- 5. RLS: BIG C can read/update all profiles (for approval screen)
DROP POLICY IF EXISTS "Big C can view all profiles" ON public.profiles;
CREATE POLICY "Big C can view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.current_user_is_big_c());

DROP POLICY IF EXISTS "Big C can update all profiles" ON public.profiles;
CREATE POLICY "Big C can update all profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.current_user_is_big_c())
  WITH CHECK (public.current_user_is_big_c());

-- 6. RLS: BIG C can manage user_roles
DROP POLICY IF EXISTS "Big C can manage roles" ON public.user_roles;
CREATE POLICY "Big C can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.current_user_is_big_c())
  WITH CHECK (public.current_user_is_big_c());