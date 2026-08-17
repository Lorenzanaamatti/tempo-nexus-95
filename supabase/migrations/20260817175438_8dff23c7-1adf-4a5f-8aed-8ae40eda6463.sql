
-- Enums
create type public.career_metric as enum ('pitches','facturacion','tracks_publicados','premios_nominaciones','proyectos_internacionales','cobertura_prensa','sincronizaciones');
create type public.career_social_network as enum ('Spotify','LinkedIn','Instagram','Facebook','TikTok','YouTube');
create type public.career_action_type as enum ('Pitch','Reunión con productor','Festival','Evento','Formación','Lanzamiento de música','Campaña de marketing','Construcción de identidad','Otro');
create type public.career_link_type as enum ('Producción','Oportunidad','Tarea','Ninguno');
create type public.platform_status as enum ('Actualizado','Desactualizado','Sin perfil');
create type public.default_platform_name as enum ('ReelCrafter','Web','IMDB');

-- Helpers
create or replace function public.can_edit_composer_plan(_composer_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(auth.uid(),'admin') or exists (
    select 1 from public.composers c
    join public.people p on p.id = c.agent_person_id
    where c.id = _composer_id and p.user_id = auth.uid()
  )
$$;

create or replace function public.can_view_composer_plan(_composer_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(auth.uid(),'admin')
      or public.has_role(auth.uid(),'team')
      or exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.composer_id = _composer_id)
      or exists (select 1 from public.composers c where c.id = _composer_id and c.owner_user_id = auth.uid())
$$;

-- career_plans
create table public.career_plans (
  id uuid primary key default gen_random_uuid(),
  representado_id uuid not null unique references public.composers(id) on delete cascade,
  created_by uuid references public.people(id) on delete set null,
  objetivo_posicionamiento text,
  objetivo_presentacion_clientes text,
  objetivo_facturacion_3y numeric,
  notas_generales text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.career_plans to authenticated;
grant all on public.career_plans to service_role;
alter table public.career_plans enable row level security;
create policy "plans view" on public.career_plans for select to authenticated using (public.can_view_composer_plan(representado_id));
create policy "plans write" on public.career_plans for all to authenticated using (public.can_edit_composer_plan(representado_id)) with check (public.can_edit_composer_plan(representado_id));
create trigger career_plans_touch before update on public.career_plans for each row execute function public.touch_updated_at();

-- helper for child tables
create or replace function public.career_plan_composer(_plan_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select representado_id from public.career_plans where id = _plan_id
$$;

create table public.career_plan_targets (
  id uuid primary key default gen_random_uuid(),
  career_plan_id uuid not null references public.career_plans(id) on delete cascade,
  "año" integer not null check ("año" between 2024 and 2030),
  metrica public.career_metric not null,
  valor_objetivo numeric,
  unique (career_plan_id, "año", metrica)
);
create table public.career_plan_social (
  id uuid primary key default gen_random_uuid(),
  career_plan_id uuid not null references public.career_plans(id) on delete cascade,
  red_social public.career_social_network not null,
  "año" integer not null,
  trimestre smallint not null check (trimestre between 1 and 4),
  seguidores_objetivo integer,
  seguidores_real integer,
  unique (career_plan_id, red_social, "año", trimestre)
);
create table public.career_plan_social_custom (
  id uuid primary key default gen_random_uuid(),
  career_plan_id uuid not null references public.career_plans(id) on delete cascade,
  nombre_red text not null,
  "año" integer not null,
  trimestre smallint not null check (trimestre between 1 and 4),
  metrica_nombre text not null default 'Seguidores',
  valor_objetivo numeric,
  valor_real numeric
);
create table public.career_plan_actions (
  id uuid primary key default gen_random_uuid(),
  career_plan_id uuid not null references public.career_plans(id) on delete cascade,
  fecha date not null default current_date,
  tipo public.career_action_type not null default 'Otro',
  descripcion text not null,
  resultado text,
  vinculo_tipo public.career_link_type not null default 'Ninguno',
  vinculo_id uuid,
  created_at timestamptz not null default now()
);

do $$ declare t text; begin
  foreach t in array array['career_plan_targets','career_plan_social','career_plan_social_custom','career_plan_actions'] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "view" on public.%I for select to authenticated using (public.can_view_composer_plan(public.career_plan_composer(career_plan_id)))', t);
    execute format('create policy "write" on public.%I for all to authenticated using (public.can_edit_composer_plan(public.career_plan_composer(career_plan_id))) with check (public.can_edit_composer_plan(public.career_plan_composer(career_plan_id)))', t);
  end loop;
end $$;

-- Plataformas
create table public.representado_plataformas (
  id uuid primary key default gen_random_uuid(),
  representado_id uuid not null references public.composers(id) on delete cascade,
  nombre public.default_platform_name not null,
  url text,
  estado public.platform_status not null default 'Sin perfil',
  fecha_ultima_actualizacion date,
  notas text,
  unique (representado_id, nombre)
);
create table public.representado_plataformas_custom (
  id uuid primary key default gen_random_uuid(),
  representado_id uuid not null references public.composers(id) on delete cascade,
  nombre_plataforma text not null,
  url text,
  estado public.platform_status not null default 'Sin perfil',
  fecha_ultima_actualizacion date,
  notas text
);
do $$ declare t text; begin
  foreach t in array array['representado_plataformas','representado_plataformas_custom'] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "view" on public.%I for select to authenticated using (public.can_view_composer_plan(representado_id))', t);
    execute format('create policy "write" on public.%I for all to authenticated using (public.can_edit_composer_plan(representado_id)) with check (public.can_edit_composer_plan(representado_id))', t);
  end loop;
end $$;

-- Plataformas por defecto configurables (Big C)
create table public.default_platforms (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  created_at timestamptz not null default now()
);
grant select on public.default_platforms to authenticated;
grant all on public.default_platforms to service_role;
alter table public.default_platforms enable row level security;
create policy "dp view" on public.default_platforms for select to authenticated using (true);
create policy "dp write" on public.default_platforms for all to authenticated using (public.current_user_is_admin()) with check (public.current_user_is_admin());
insert into public.default_platforms (nombre) values ('ReelCrafter'),('Web'),('IMDB');

-- Alta automática de las plataformas por defecto
create or replace function public.seed_representado_plataformas()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.representado_plataformas (representado_id, nombre, estado)
  values (new.id,'ReelCrafter','Sin perfil'),(new.id,'Web','Sin perfil'),(new.id,'IMDB','Sin perfil')
  on conflict do nothing;
  return new;
end $$;
create trigger composers_seed_plataformas after insert on public.composers
for each row execute function public.seed_representado_plataformas();

insert into public.representado_plataformas (representado_id, nombre, estado)
select c.id, n.nombre, 'Sin perfil'::public.platform_status
from public.composers c cross join (values ('ReelCrafter'::public.default_platform_name),('Web'),('IMDB')) as n(nombre)
on conflict do nothing;
