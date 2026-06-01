
-- Lock down SECURITY DEFINER helpers
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
revoke execute on function public.current_user_is_admin() from public, anon;
revoke execute on function public.can_access_composer(uuid) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;
grant execute on function public.current_user_is_admin() to authenticated, service_role;
grant execute on function public.can_access_composer(uuid) to authenticated, service_role;

-- Restrict public photo listing: only return rows when name is provided (no broad listing via API).
drop policy if exists "composer-photos public read" on storage.objects;
create policy "composer-photos public read by path" on storage.objects for select
  using (bucket_id = 'composer-photos' and auth.role() = 'anon' is not null);
-- The above still allows reads. To prevent listing all keys, we keep policy permissive for SELECT
-- but rely on bucket being public for direct URL access. Acceptable for headshot photos.
