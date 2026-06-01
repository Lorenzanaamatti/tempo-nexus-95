
-- =========================================================
-- 1. DROP previous finance tables
-- =========================================================
drop table if exists public.budget_lines cascade;
drop table if exists public.invoices cascade;
drop table if exists public.budgets cascade;
drop table if exists public.projects cascade;
drop type if exists public.invoice_direction cascade;
drop type if exists public.invoice_status cascade;

-- =========================================================
-- 2. Roles
-- =========================================================
do $$ begin
  create type public.app_role as enum ('admin', 'composer');
exception when duplicate_object then null; end $$;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(auth.uid(), 'admin')
$$;

create policy "user_roles self read" on public.user_roles
  for select to authenticated using (user_id = auth.uid() or public.current_user_is_admin());
create policy "user_roles admin write" on public.user_roles
  for all to authenticated
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

-- =========================================================
-- 3. Profiles: add composer_id link
-- =========================================================
alter table public.profiles add column if not exists composer_id uuid;

-- First-user-admin bootstrap + profile creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _is_first boolean;
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  -- promote first ever user to admin
  select not exists (select 1 from public.user_roles where role = 'admin') into _is_first;
  if _is_first then
    insert into public.user_roles (user_id, role) values (new.id, 'admin') on conflict do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================
-- 4. Catalogs
-- =========================================================
create table if not exists public.music_styles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label_es text not null,
  label_ca text,
  label_en text,
  position int not null default 0
);
create table if not exists public.av_genres (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label_es text not null,
  label_ca text,
  label_en text,
  position int not null default 0
);
create table if not exists public.languages (
  code text primary key,
  label_es text not null,
  label_ca text,
  label_en text
);
create table if not exists public.fee_ranges (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  position int not null default 0
);

grant select on public.music_styles, public.av_genres, public.languages, public.fee_ranges to authenticated;
grant all on public.music_styles, public.av_genres, public.languages, public.fee_ranges to service_role;

alter table public.music_styles enable row level security;
alter table public.av_genres enable row level security;
alter table public.languages enable row level security;
alter table public.fee_ranges enable row level security;

create policy "music_styles read" on public.music_styles for select to authenticated using (true);
create policy "music_styles admin" on public.music_styles for all to authenticated using (public.current_user_is_admin()) with check (public.current_user_is_admin());
create policy "av_genres read" on public.av_genres for select to authenticated using (true);
create policy "av_genres admin" on public.av_genres for all to authenticated using (public.current_user_is_admin()) with check (public.current_user_is_admin());
create policy "languages read" on public.languages for select to authenticated using (true);
create policy "languages admin" on public.languages for all to authenticated using (public.current_user_is_admin()) with check (public.current_user_is_admin());
create policy "fee_ranges read" on public.fee_ranges for select to authenticated using (true);
create policy "fee_ranges admin" on public.fee_ranges for all to authenticated using (public.current_user_is_admin()) with check (public.current_user_is_admin());

-- Seeds
insert into public.music_styles (slug, label_es, label_ca, label_en, position) values
  ('orquestal','Orquestal','Orquestral','Orchestral',1),
  ('electronico','Electrónico','Electrònic','Electronic',2),
  ('hibrido','Híbrido','Híbrid','Hybrid',3),
  ('jazz','Jazz','Jazz','Jazz',4),
  ('folk','Folk','Folk','Folk',5),
  ('ambient','Ambient','Ambient','Ambient',6),
  ('coral','Coral','Coral','Choral',7),
  ('world','World music','Músiques del món','World music',8),
  ('electroacustico','Electroacústico','Electroacústic','Electroacoustic',9),
  ('minimalismo','Minimalismo','Minimalisme','Minimalism',10),
  ('experimental','Experimental','Experimental','Experimental',11)
on conflict (slug) do nothing;

insert into public.av_genres (slug, label_es, label_ca, label_en, position) values
  ('drama','Drama','Drama','Drama',1),
  ('thriller','Thriller','Thriller','Thriller',2),
  ('comedia','Comedia','Comèdia','Comedy',3),
  ('documental','Documental','Documental','Documentary',4),
  ('animacion','Animación','Animació','Animation',5),
  ('terror','Terror','Terror','Horror',6),
  ('romantico','Romántico','Romàntic','Romance',7),
  ('historico','Histórico','Històric','Historical',8),
  ('scifi','Ciencia ficción','Ciència-ficció','Sci-fi',9),
  ('publicidad','Publicidad','Publicitat','Advertising',10),
  ('videojuego','Videojuego','Videojoc','Video game',11)
on conflict (slug) do nothing;

insert into public.languages (code, label_es, label_ca, label_en) values
  ('es','Español','Espanyol','Spanish'),
  ('ca','Catalán','Català','Catalan'),
  ('en','Inglés','Anglès','English'),
  ('fr','Francés','Francès','French'),
  ('it','Italiano','Italià','Italian'),
  ('de','Alemán','Alemany','German'),
  ('pt','Portugués','Portuguès','Portuguese')
on conflict (code) do nothing;

insert into public.fee_ranges (code, label, position) values
  ('consultar','Consultar',0),
  ('A','Rango A',1),
  ('B','Rango B',2),
  ('C','Rango C',3),
  ('D','Rango D',4)
on conflict (code) do nothing;

-- =========================================================
-- 5. Composers core
-- =========================================================
do $$ begin
  create type public.availability_status as enum ('available','partial','unavailable');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.film_format as enum ('feature','series','doc','short','spot','game','other');
exception when duplicate_object then null; end $$;

create table if not exists public.composers (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete set null,
  owner_email text,
  full_name text not null,
  slug text not null unique,
  photo_path text,
  city text,
  country text,
  bio_short text check (char_length(coalesce(bio_short,'')) <= 320),
  bio_long text,
  birth_year int,
  availability public.availability_status not null default 'available',
  next_available_on date,
  fee_range_id uuid references public.fee_ranges(id),
  internal_notes text,
  tags text[] not null default '{}',
  reel_url text,
  search_tsv tsvector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists composers_search_idx on public.composers using gin(search_tsv);
create index if not exists composers_owner_idx on public.composers(owner_user_id);
create index if not exists composers_availability_idx on public.composers(availability);

create table if not exists public.composer_styles (
  composer_id uuid not null references public.composers(id) on delete cascade,
  style_id uuid not null references public.music_styles(id) on delete cascade,
  primary key (composer_id, style_id)
);
create table if not exists public.composer_genres (
  composer_id uuid not null references public.composers(id) on delete cascade,
  genre_id uuid not null references public.av_genres(id) on delete cascade,
  primary key (composer_id, genre_id)
);
create table if not exists public.composer_languages (
  composer_id uuid not null references public.composers(id) on delete cascade,
  language_code text not null references public.languages(code) on delete cascade,
  primary key (composer_id, language_code)
);
create table if not exists public.composer_demos (
  id uuid primary key default gen_random_uuid(),
  composer_id uuid not null references public.composers(id) on delete cascade,
  title text not null,
  description text,
  duration_seconds int,
  url text,
  category text,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists public.composer_filmography (
  id uuid primary key default gen_random_uuid(),
  composer_id uuid not null references public.composers(id) on delete cascade,
  title text not null,
  year int,
  production_company text,
  director text,
  format public.film_format not null default 'feature',
  country text,
  url text,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists public.composer_awards (
  id uuid primary key default gen_random_uuid(),
  composer_id uuid not null references public.composers(id) on delete cascade,
  title text not null,
  year int,
  note text,
  position int not null default 0,
  created_at timestamptz not null default now()
);

-- Grants
grant select, insert, update, delete on
  public.composers, public.composer_styles, public.composer_genres,
  public.composer_languages, public.composer_demos, public.composer_filmography,
  public.composer_awards
  to authenticated;
grant all on
  public.composers, public.composer_styles, public.composer_genres,
  public.composer_languages, public.composer_demos, public.composer_filmography,
  public.composer_awards
  to service_role;

-- =========================================================
-- 6. Touch updated_at
-- =========================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists composers_touch on public.composers;
create trigger composers_touch before update on public.composers
  for each row execute function public.touch_updated_at();

-- =========================================================
-- 7. Search vector trigger
-- =========================================================
create or replace function public.composer_refresh_tsv()
returns trigger language plpgsql set search_path = public as $$
declare
  film_text text;
begin
  select coalesce(string_agg(coalesce(title,'')||' '||coalesce(director,'')||' '||coalesce(production_company,''), ' '), '')
    into film_text from public.composer_filmography where composer_id = new.id;
  new.search_tsv :=
    setweight(to_tsvector('spanish', coalesce(new.full_name,'')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(new.bio_short,'')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(new.bio_long,'')), 'C') ||
    setweight(to_tsvector('spanish', array_to_string(new.tags, ' ')), 'B') ||
    setweight(to_tsvector('spanish', film_text), 'C');
  return new;
end; $$;

drop trigger if exists composers_tsv on public.composers;
create trigger composers_tsv before insert or update on public.composers
  for each row execute function public.composer_refresh_tsv();

-- Trigger to recompute composer tsv when filmography changes
create or replace function public.composer_filmography_touch_parent()
returns trigger language plpgsql set search_path = public as $$
declare
  _cid uuid;
begin
  _cid := coalesce(new.composer_id, old.composer_id);
  update public.composers set updated_at = now() where id = _cid;
  return null;
end; $$;

drop trigger if exists composer_filmography_touch on public.composer_filmography;
create trigger composer_filmography_touch after insert or update or delete on public.composer_filmography
  for each row execute function public.composer_filmography_touch_parent();

-- =========================================================
-- 8. Field guard for non-admin updates
-- =========================================================
create or replace function public.composer_field_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if public.current_user_is_admin() then
    return new;
  end if;
  -- Only owner reaches here (RLS already filters). Lock fields:
  new.internal_notes := old.internal_notes;
  new.fee_range_id := old.fee_range_id;
  new.slug := old.slug;
  new.owner_user_id := old.owner_user_id;
  new.owner_email := old.owner_email;
  new.tags := old.tags;
  new.full_name := old.full_name; -- name managed by IC
  return new;
end; $$;

drop trigger if exists composers_field_guard on public.composers;
create trigger composers_field_guard before update on public.composers
  for each row execute function public.composer_field_guard();

-- =========================================================
-- 9. RLS for composers + children
-- =========================================================
alter table public.composers enable row level security;
alter table public.composer_styles enable row level security;
alter table public.composer_genres enable row level security;
alter table public.composer_languages enable row level security;
alter table public.composer_demos enable row level security;
alter table public.composer_filmography enable row level security;
alter table public.composer_awards enable row level security;

-- composers
create policy "composers select" on public.composers for select to authenticated
  using (public.current_user_is_admin() or owner_user_id = auth.uid());
create policy "composers admin insert" on public.composers for insert to authenticated
  with check (public.current_user_is_admin());
create policy "composers admin delete" on public.composers for delete to authenticated
  using (public.current_user_is_admin());
create policy "composers update self or admin" on public.composers for update to authenticated
  using (public.current_user_is_admin() or owner_user_id = auth.uid())
  with check (public.current_user_is_admin() or owner_user_id = auth.uid());

-- Helper for children
create or replace function public.can_access_composer(_composer_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.composers c
    where c.id = _composer_id
      and (public.current_user_is_admin() or c.owner_user_id = auth.uid())
  )
$$;

-- M:N tables: admin only mutate; everyone with access reads
create policy "composer_styles read" on public.composer_styles for select to authenticated
  using (public.can_access_composer(composer_id));
create policy "composer_styles admin" on public.composer_styles for all to authenticated
  using (public.current_user_is_admin()) with check (public.current_user_is_admin());

create policy "composer_genres read" on public.composer_genres for select to authenticated
  using (public.can_access_composer(composer_id));
create policy "composer_genres admin" on public.composer_genres for all to authenticated
  using (public.current_user_is_admin()) with check (public.current_user_is_admin());

-- Languages: owner can edit own
create policy "composer_languages read" on public.composer_languages for select to authenticated
  using (public.can_access_composer(composer_id));
create policy "composer_languages write" on public.composer_languages for all to authenticated
  using (public.can_access_composer(composer_id)) with check (public.can_access_composer(composer_id));

-- Demos, filmography, awards: owner or admin
create policy "composer_demos all" on public.composer_demos for all to authenticated
  using (public.can_access_composer(composer_id)) with check (public.can_access_composer(composer_id));
create policy "composer_filmography all" on public.composer_filmography for all to authenticated
  using (public.can_access_composer(composer_id)) with check (public.can_access_composer(composer_id));
create policy "composer_awards all" on public.composer_awards for all to authenticated
  using (public.can_access_composer(composer_id)) with check (public.can_access_composer(composer_id));

-- =========================================================
-- 10. Storage buckets + policies
-- =========================================================
insert into storage.buckets (id, name, public) values ('composer-photos','composer-photos', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('composer-assets','composer-assets', false)
  on conflict (id) do nothing;

-- Public read for photos
create policy "composer-photos public read" on storage.objects for select
  using (bucket_id = 'composer-photos');
-- Admin or owner can write photos (object name expected to start with composerId/)
create policy "composer-photos admin or owner write" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'composer-photos' and (
      public.current_user_is_admin()
      or public.can_access_composer(((storage.foldername(name))[1])::uuid)
    )
  );
create policy "composer-photos admin or owner update" on storage.objects for update to authenticated
  using (
    bucket_id = 'composer-photos' and (
      public.current_user_is_admin()
      or public.can_access_composer(((storage.foldername(name))[1])::uuid)
    )
  );
create policy "composer-photos admin or owner delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'composer-photos' and (
      public.current_user_is_admin()
      or public.can_access_composer(((storage.foldername(name))[1])::uuid)
    )
  );

-- Private bucket: only admin or owner read/write
create policy "composer-assets owner read" on storage.objects for select to authenticated
  using (
    bucket_id = 'composer-assets' and (
      public.current_user_is_admin()
      or public.can_access_composer(((storage.foldername(name))[1])::uuid)
    )
  );
create policy "composer-assets owner write" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'composer-assets' and (
      public.current_user_is_admin()
      or public.can_access_composer(((storage.foldername(name))[1])::uuid)
    )
  );
create policy "composer-assets owner update" on storage.objects for update to authenticated
  using (
    bucket_id = 'composer-assets' and (
      public.current_user_is_admin()
      or public.can_access_composer(((storage.foldername(name))[1])::uuid)
    )
  );
create policy "composer-assets owner delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'composer-assets' and (
      public.current_user_is_admin()
      or public.can_access_composer(((storage.foldername(name))[1])::uuid)
    )
  );
