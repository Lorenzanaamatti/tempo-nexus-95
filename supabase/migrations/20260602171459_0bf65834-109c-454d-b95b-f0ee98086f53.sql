
create or replace function public.link_composer_to_user(_composer_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _email text;
  _uid uuid;
begin
  select coalesce(nullif(owner_email,''), nullif(email,'')) into _email
    from public.composers where id = _composer_id;
  if _email is null then return; end if;

  select id into _uid from auth.users where lower(email) = lower(_email) limit 1;
  if _uid is null then return; end if;

  update public.composers
     set owner_user_id = _uid
   where id = _composer_id and (owner_user_id is null or owner_user_id <> _uid);

  insert into public.profiles (id, composer_id)
    values (_uid, _composer_id)
    on conflict (id) do update set composer_id = excluded.composer_id;

  insert into public.user_roles (user_id, role)
    values (_uid, 'composer')
    on conflict do nothing;
end;
$$;

create or replace function public.composers_autolink_trg()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.email is not null or new.owner_email is not null) and new.owner_user_id is null then
    perform public.link_composer_to_user(new.id);
  end if;
  return null;
end;
$$;

drop trigger if exists composers_autolink on public.composers;
create trigger composers_autolink
  after insert or update of email, owner_email on public.composers
  for each row execute function public.composers_autolink_trg();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  _is_first boolean;
  _composer_id uuid;
begin
  select id into _composer_id
    from public.composers
   where lower(coalesce(nullif(owner_email,''), nullif(email,''))) = lower(new.email)
   limit 1;

  insert into public.profiles (id, display_name, avatar_url, composer_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    _composer_id
  )
  on conflict (id) do update set composer_id = coalesce(public.profiles.composer_id, excluded.composer_id);

  select not exists (select 1 from public.user_roles where role = 'admin') into _is_first;
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

do $$
declare r record;
begin
  for r in select id from public.composers where owner_user_id is null and (email is not null or owner_email is not null) loop
    perform public.link_composer_to_user(r.id);
  end loop;
end $$;
