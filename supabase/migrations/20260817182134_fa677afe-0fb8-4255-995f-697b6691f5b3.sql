
-- ENUMS
create type public.ic_rol as enum ('direccion','representacion','produccion','administracion','marketing','comunicacion','legal','otro');
create type public.contrato_ic_tipo as enum ('laboral_indefinido','laboral_temporal','freelance','proveedor','otro');
create type public.template_tipo as enum ('contrato','deal_memo','adenda','contrato_laboral','contrato_proveedor','presupuesto','email_cliente','email_produccion','email_proveedor','comunicado_interno','otro');
create type public.template_idioma as enum ('castellano','catalan','ingles','otro');
create type public.publicacion_canal as enum ('instagram','linkedin','spotify','tiktok','youtube','facebook','web','newsletter','prensa','otro');
create type public.publicacion_tipo as enum ('post','story','reel','newsletter','nota_prensa','entrevista','comunicado','otro');
create type public.publicacion_estado as enum ('borrador','programado','publicado');
create type public.obligacion_estado as enum ('pendiente','completada','vencida');
create type public.campana_tipo as enum ('digital','prensa','sinc','festival','academica','otra');
create type public.campana_estado as enum ('planificada','activa','completada','pausada','cancelada');

-- PEOPLE: human team profile + AI agent status
alter table public.people
  add column if not exists last_name text,
  add column if not exists ic_roles public.ic_rol[] not null default '{}',
  add column if not exists role_description text,
  add column if not exists contract_type public.contrato_ic_tipo,
  add column if not exists contract_start date,
  add column if not exists contract_end date,
  add column if not exists contract_salary_annual numeric,
  add column if not exists contract_fee_amount numeric,
  add column if not exists contract_fee_period text,
  add column if not exists contract_notes text,
  add column if not exists agent_description text,
  add column if not exists agent_active boolean not null default true,
  add column if not exists agent_last_used_at timestamptz;

-- TEMPLATES
create table public.templates (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo public.template_tipo not null default 'otro',
  descripcion text,
  idioma public.template_idioma not null default 'castellano',
  contenido text not null default '',
  uso_agentes boolean not null default false,
  agente_autorizado text[] not null default '{}',
  creado_por uuid,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.templates to authenticated;
grant all on public.templates to service_role;
alter table public.templates enable row level security;
create policy "templates read" on public.templates for select to authenticated using (true);
create policy "templates write" on public.templates for all to authenticated using (public.current_user_is_big_c()) with check (public.current_user_is_big_c());
create trigger templates_touch before update on public.templates for each row execute function public.touch_updated_at();

-- PUBLICACIONES
create table public.publicaciones (
  id uuid primary key default gen_random_uuid(),
  fecha date not null default current_date,
  canal public.publicacion_canal not null default 'instagram',
  tipo public.publicacion_tipo not null default 'post',
  contenido_resumen text,
  representado_vinculado uuid references public.composers(id) on delete set null,
  proyecto_vinculado uuid references public.productions(id) on delete set null,
  campana_id uuid,
  url text,
  alcance integer,
  estado public.publicacion_estado not null default 'borrador',
  creado_por uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.publicaciones to authenticated;
grant all on public.publicaciones to service_role;
alter table public.publicaciones enable row level security;
create policy "publicaciones all" on public.publicaciones for all to authenticated using (public.current_user_is_admin()) with check (public.current_user_is_admin());
create trigger publicaciones_touch before update on public.publicaciones for each row execute function public.touch_updated_at();

-- OBLIGACIONES DE COMUNICACION
create table public.obligaciones_comunicacion (
  id uuid primary key default gen_random_uuid(),
  descripcion text not null,
  representado_vinculado uuid references public.composers(id) on delete set null,
  produccion_vinculada uuid references public.productions(id) on delete set null,
  contrato_vinculado uuid references public.contracts(id) on delete set null,
  fecha_limite date not null,
  estado public.obligacion_estado not null default 'pendiente',
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.obligaciones_comunicacion to authenticated;
grant all on public.obligaciones_comunicacion to service_role;
alter table public.obligaciones_comunicacion enable row level security;
create policy "obligaciones all" on public.obligaciones_comunicacion for all to authenticated using (public.current_user_is_admin()) with check (public.current_user_is_admin());
create trigger obligaciones_touch before update on public.obligaciones_comunicacion for each row execute function public.touch_updated_at();

create or replace function public.sync_obligacion_comunicacion()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare _owner uuid;
begin
  if tg_op = 'DELETE' then
    delete from public.calendar_events where subject_id = old.id and source_kind = 'obligacion_comunicacion';
    delete from public.actions where subject_id = old.id and subarea = 'preaviso_comunicacion';
    return old;
  end if;
  delete from public.calendar_events where subject_id = new.id and source_kind = 'obligacion_comunicacion';
  delete from public.actions where subject_id = new.id and subarea = 'preaviso_comunicacion' and done = false;
  if new.estado <> 'completada' then
    insert into public.calendar_events (subject_type, subject_id, kind, calendar_category, start_date, end_date, title, note, source_kind)
    values ('composer', new.id, 'deadline', 'marketing', new.fecha_limite, new.fecha_limite,
            'Obligación comunicación · ' || new.descripcion, '/comunicacion/obligaciones', 'obligacion_comunicacion');
    _owner := public.deadline_owner_person(new.representado_vinculado);
    insert into public.actions (subject_type, subject_id, title, notes, kind, due_date, assignee_person_id, area, subarea)
    values ('composer', new.id,
            'AITANA preaviso 15 días: ' || new.descripcion || ' — ' || to_char(new.fecha_limite,'DD/MM/YYYY'),
            '/comunicacion/obligaciones', 'tarea', new.fecha_limite - 15, _owner, 'comunicacion', 'preaviso_comunicacion');
  end if;
  return new;
end $$;
create trigger obligaciones_sync after insert or update or delete on public.obligaciones_comunicacion
for each row execute function public.sync_obligacion_comunicacion();

-- CAMPANAS
create table public.campanas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  representado_vinculado uuid references public.composers(id) on delete set null,
  tipo public.campana_tipo not null default 'digital',
  objetivo text,
  fecha_inicio date,
  fecha_fin date,
  presupuesto numeric,
  inversion_real numeric,
  canales text[] not null default '{}',
  estado public.campana_estado not null default 'planificada',
  resultados_resumen text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.campanas to authenticated;
grant all on public.campanas to service_role;
alter table public.campanas enable row level security;
create policy "campanas all" on public.campanas for all to authenticated using (public.current_user_is_admin()) with check (public.current_user_is_admin());
create trigger campanas_touch before update on public.campanas for each row execute function public.touch_updated_at();
alter table public.publicaciones add constraint publicaciones_campana_fk foreign key (campana_id) references public.campanas(id) on delete set null;

-- METRICAS DE MARKETING
create table public.marketing_metricas (
  id uuid primary key default gen_random_uuid(),
  composer_id uuid references public.composers(id) on delete cascade,
  plataforma text not null,
  seguidores integer,
  crecimiento_mes integer,
  crecimiento_pct numeric,
  alcance_promedio integer,
  publicaciones_mes integer,
  mejor_publicacion_url text,
  periodo date not null default date_trunc('month', current_date)::date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.marketing_metricas to authenticated;
grant all on public.marketing_metricas to service_role;
alter table public.marketing_metricas enable row level security;
create policy "marketing_metricas all" on public.marketing_metricas for all to authenticated using (public.current_user_is_admin()) with check (public.current_user_is_admin());
create trigger marketing_metricas_touch before update on public.marketing_metricas for each row execute function public.touch_updated_at();

create table public.plataforma_checklist (
  id uuid primary key default gen_random_uuid(),
  composer_id uuid references public.composers(id) on delete cascade,
  plataforma text not null,
  actualizado boolean not null default false,
  ultima_actualizacion date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.plataforma_checklist to authenticated;
grant all on public.plataforma_checklist to service_role;
alter table public.plataforma_checklist enable row level security;
create policy "plataforma_checklist all" on public.plataforma_checklist for all to authenticated using (public.current_user_is_admin()) with check (public.current_user_is_admin());
create trigger plataforma_checklist_touch before update on public.plataforma_checklist for each row execute function public.touch_updated_at();

-- IDENTIDAD CORPORATIVA (singleton)
create table public.comunicacion_identidad (
  id uuid primary key default gen_random_uuid(),
  paleta jsonb not null default '[]',
  tipografias text,
  tono text,
  guia_uso text,
  redes jsonb not null default '[]',
  bio_castellano text,
  bio_catalan text,
  bio_ingles text,
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.comunicacion_identidad to authenticated;
grant all on public.comunicacion_identidad to service_role;
alter table public.comunicacion_identidad enable row level security;
create policy "identidad read" on public.comunicacion_identidad for select to authenticated using (true);
create policy "identidad write" on public.comunicacion_identidad for all to authenticated using (public.current_user_is_big_c()) with check (public.current_user_is_big_c());
create trigger identidad_touch before update on public.comunicacion_identidad for each row execute function public.touch_updated_at();
insert into public.comunicacion_identidad (tipografias) values ('Bricolage Grotesque · Space Mono · Space Grotesk');

-- Agent descriptions
update public.people set agent_description = case full_name
  when 'AIDA' then 'Asistente de datos: mantiene fichas, catálogos y CRM al día.'
  when 'AINARA' then 'Asistente de negocio: oportunidades, cuentas objetivo y seguimiento comercial.'
  when 'AITANA' then 'Asistente de comunicación: publicaciones, obligaciones y preavisos.'
  when 'AITOR' then 'Asistente legal y administrativo: contratos, deal memos y presupuestos.'
  else agent_description end
where is_virtual_assistant = true;
