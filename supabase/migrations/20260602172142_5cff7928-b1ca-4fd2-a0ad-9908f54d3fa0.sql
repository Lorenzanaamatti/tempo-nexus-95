
-- =========================
-- 1) Composer videos
-- =========================
create table public.composer_videos (
  id uuid primary key default gen_random_uuid(),
  composer_id uuid not null references public.composers(id) on delete cascade,
  storage_path text,
  external_url text,
  poster_path text,
  title text,
  duration_seconds integer,
  year integer,
  copyright text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index idx_composer_videos_composer on public.composer_videos(composer_id);

grant select, insert, update, delete on public.composer_videos to authenticated;
grant all on public.composer_videos to service_role;

alter table public.composer_videos enable row level security;

create policy "composer_videos all" on public.composer_videos
  for all to authenticated
  using (public.can_access_composer(composer_id))
  with check (public.can_access_composer(composer_id));

-- cap at 12 like photos
create or replace function public.composer_videos_enforce_cap()
returns trigger language plpgsql set search_path = public as $$
declare _count integer;
begin
  select count(*) into _count from public.composer_videos where composer_id = new.composer_id;
  if _count >= 12 then
    raise exception 'Cada compositor puede tener un máximo de 12 vídeos';
  end if;
  return new;
end; $$;
create trigger composer_videos_cap before insert on public.composer_videos
  for each row execute function public.composer_videos_enforce_cap();

-- =========================
-- 2) Social Media module
-- =========================
create type social_channel as enum ('instagram','facebook','linkedin','youtube','tiktok','otra');
create type social_format as enum ('feed','reel','story','carousel','video','live','articulo');
create type social_post_status as enum ('borrador','en_revision','aprobado','programado','publicado','archivado');
create type social_asset_kind as enum ('image','video','audio','gif','documento');

-- Campaigns
create table public.social_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  objective text,
  start_date date,
  end_date date,
  target_reach integer,
  target_engagement integer,
  target_leads integer,
  composer_id uuid references public.composers(id) on delete set null,
  production_id uuid references public.productions(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger social_campaigns_touch before update on public.social_campaigns
  for each row execute function public.touch_updated_at();

grant select, insert, update, delete on public.social_campaigns to authenticated;
grant all on public.social_campaigns to service_role;
alter table public.social_campaigns enable row level security;
create policy "social_campaigns admin write" on public.social_campaigns
  for all to authenticated using (public.current_user_is_admin()) with check (public.current_user_is_admin());
create policy "social_campaigns read" on public.social_campaigns
  for select to authenticated using (true);

-- Posts
create table public.social_posts (
  id uuid primary key default gen_random_uuid(),
  parent_post_id uuid references public.social_posts(id) on delete set null,
  campaign_id uuid references public.social_campaigns(id) on delete set null,
  composer_id uuid references public.composers(id) on delete set null,
  production_id uuid references public.productions(id) on delete set null,
  channel social_channel not null,
  format social_format not null default 'feed',
  title text,
  copy_es text,
  copy_en text,
  copy_ca text,
  hashtags text[] not null default '{}',
  cta_label text,
  cta_url text,
  brief text,
  scheduled_for timestamptz,
  published_at timestamptz,
  published_url text,
  status social_post_status not null default 'borrador',
  owner_person_id uuid references public.people(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_social_posts_channel on public.social_posts(channel);
create index idx_social_posts_composer on public.social_posts(composer_id);
create index idx_social_posts_production on public.social_posts(production_id);
create index idx_social_posts_scheduled on public.social_posts(scheduled_for);
create trigger social_posts_touch before update on public.social_posts
  for each row execute function public.touch_updated_at();

grant select, insert, update, delete on public.social_posts to authenticated;
grant all on public.social_posts to service_role;
alter table public.social_posts enable row level security;
create policy "social_posts admin write" on public.social_posts
  for all to authenticated using (public.current_user_is_admin()) with check (public.current_user_is_admin());
create policy "social_posts read" on public.social_posts
  for select to authenticated
  using (
    public.current_user_is_admin()
    or composer_id is null
    or public.can_access_composer(composer_id)
  );

-- Post assets
create table public.social_post_assets (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.social_posts(id) on delete cascade,
  kind social_asset_kind not null default 'image',
  storage_path text,
  external_url text,
  caption text,
  alt_text text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index idx_social_post_assets_post on public.social_post_assets(post_id);

grant select, insert, update, delete on public.social_post_assets to authenticated;
grant all on public.social_post_assets to service_role;
alter table public.social_post_assets enable row level security;
create policy "social_post_assets admin write" on public.social_post_assets
  for all to authenticated using (public.current_user_is_admin()) with check (public.current_user_is_admin());
create policy "social_post_assets read" on public.social_post_assets
  for select to authenticated using (true);

-- Copy templates
create table public.social_copy_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  channel social_channel,
  occasion text,
  body_md text,
  variables text[] not null default '{}',
  language text not null default 'es',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger social_copy_templates_touch before update on public.social_copy_templates
  for each row execute function public.touch_updated_at();

grant select, insert, update, delete on public.social_copy_templates to authenticated;
grant all on public.social_copy_templates to service_role;
alter table public.social_copy_templates enable row level security;
create policy "social_copy_templates admin write" on public.social_copy_templates
  for all to authenticated using (public.current_user_is_admin()) with check (public.current_user_is_admin());
create policy "social_copy_templates read" on public.social_copy_templates
  for select to authenticated using (true);

-- Hashtag sets
create table public.social_hashtag_sets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  channel social_channel,
  genre_id uuid references public.av_genres(id) on delete set null,
  hashtags text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger social_hashtag_sets_touch before update on public.social_hashtag_sets
  for each row execute function public.touch_updated_at();

grant select, insert, update, delete on public.social_hashtag_sets to authenticated;
grant all on public.social_hashtag_sets to service_role;
alter table public.social_hashtag_sets enable row level security;
create policy "social_hashtag_sets admin write" on public.social_hashtag_sets
  for all to authenticated using (public.current_user_is_admin()) with check (public.current_user_is_admin());
create policy "social_hashtag_sets read" on public.social_hashtag_sets
  for select to authenticated using (true);

-- Post metrics
create table public.social_post_metrics (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null unique references public.social_posts(id) on delete cascade,
  impressions integer,
  reach integer,
  likes integer,
  comments integer,
  shares integer,
  saves integer,
  clicks integer,
  video_views integer,
  measured_at timestamptz not null default now(),
  notes text
);
grant select, insert, update, delete on public.social_post_metrics to authenticated;
grant all on public.social_post_metrics to service_role;
alter table public.social_post_metrics enable row level security;
create policy "social_post_metrics admin write" on public.social_post_metrics
  for all to authenticated using (public.current_user_is_admin()) with check (public.current_user_is_admin());
create policy "social_post_metrics read" on public.social_post_metrics
  for select to authenticated using (true);
