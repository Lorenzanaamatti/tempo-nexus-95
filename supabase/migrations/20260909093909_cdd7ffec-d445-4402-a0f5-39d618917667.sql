
do $$ begin
  create type public.opp_production_type as enum ('pelicula','serie','documental','animacion','otro');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.opp_production_genre as enum ('ficcion','animacion','no_ficcion');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.opp_phase as enum ('desarrollo','preproduccion','rodaje','postproduccion','finalizado','estreno');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.opp_priority as enum ('alta','media','baja');
exception when duplicate_object then null; end $$;

alter table public.opportunities
  add column if not exists titulo_alt text,
  add column if not exists tipo_produccion public.opp_production_type,
  add column if not exists genero_produccion public.opp_production_genre,
  add column if not exists paises text[] not null default '{}'::text[],
  add column if not exists es_coproduccion boolean not null default false,
  add column if not exists presupuesto_min numeric,
  add column if not exists presupuesto_max numeric,
  add column if not exists presupuesto_texto text,
  add column if not exists financiacion_publica text,
  add column if not exists fase public.opp_phase,
  add column if not exists fecha_rodaje text,
  add column if not exists fecha_estreno text,
  add column if not exists productora_aie text,
  add column if not exists director_id uuid references public.directors(id) on delete set null,
  add column if not exists director_text text,
  add column if not exists reparto text,
  add column if not exists fuente_url text,
  add column if not exists origen text,
  add column if not exists prioridad public.opp_priority;

create or replace function public.opportunities_set_coproduccion()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.es_coproduccion := coalesce(array_length(new.paises, 1), 0) > 1;
  return new;
end;
$$;

drop trigger if exists opportunities_set_coproduccion_trg on public.opportunities;
create trigger opportunities_set_coproduccion_trg
before insert or update of paises on public.opportunities
for each row execute function public.opportunities_set_coproduccion();

create unique index if not exists opportunities_dedupe_key
  on public.opportunities (
    lower(btrim(title)),
    coalesce(director_id::text, lower(btrim(coalesce(director_text, ''))))
  );

grant select, insert, update, delete on public.opportunities to authenticated;
grant all on public.opportunities to service_role;
