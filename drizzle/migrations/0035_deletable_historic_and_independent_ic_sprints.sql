ALTER TABLE public.producciones_espanolas ADD COLUMN IF NOT EXISTS ic_ficha_descartada boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.espanolas_propagate()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_prod uuid := NEW.produccion_ic_vinculada;
  v_comp uuid;
  ids uuid[];
  cid uuid;
  co text;
  v_title text := coalesce(nullif(btrim(coalesce(NEW.title_es,'')),''), NEW.title);
  v_fmt film_format := case when NEW.media_type = 'tv' then 'series' else 'feature' end::film_format;
begin
  if pg_trigger_depth() > 3 then return NEW; end if;
  if not coalesce(NEW.ic_participo, false) then return NEW; end if;

  foreach co in array coalesce(NEW.production_companies, '{}'::text[]) loop
    if btrim(coalesce(co,'')) <> '' then
      insert into public.partners (tipo, nombre, pais, notas)
      select 'Productora'::partner_tipo, btrim(co), 'España',
             'Alta automática desde CRM Producciones españolas'
      where not exists (select 1 from public.partners p where lower(btrim(p.nombre)) = lower(btrim(co)));
    end if;
  end loop;

  ids := public.ic_composer_ids(
    array_remove(ARRAY[NEW.composer, NEW.music_supervisor, NEW.mezclador, NEW.orquestador, NEW.director_orquesta]
                 || coalesce(NEW.directors, '{}'::text[]), NULL));
  if coalesce(array_length(NEW.representados_vinculados,1),0) > 0 then
    ids := ids || NEW.representados_vinculados::uuid[];
  end if;
  select coalesce(array_agg(distinct x), '{}'::uuid[]) into ids from unnest(ids) t(x);
  if coalesce(array_length(ids,1),0) = 0 then return NEW; end if;

  v_comp := coalesce((public.ic_composer_ids(array_remove(ARRAY[NEW.composer], NULL)))[1], ids[1]);

  if v_prod is null then
    select p.id into v_prod from public.productions p
     where lower(btrim(p.title)) = lower(btrim(v_title))
       and (NEW.year is null or p.year is null or p.year = NEW.year)
     limit 1;
  end if;

  -- Si la ficha vinculada se eliminó a mano, no la recreamos.
  if v_prod is null and coalesce(NEW.ic_ficha_descartada, false) then
    return NEW;
  end if;

  if v_prod is null then
    insert into public.productions
      (title, year, kind, production_company, director, platform, composer_id, external_composer,
       music_supervisor_name, country, status, is_historical, notes)
    values
      (v_title, NEW.year, case when NEW.media_type = 'tv' then 'series' else 'feature' end,
       (coalesce(NEW.production_companies,'{}'::text[]))[1],
       (coalesce(NEW.directors,'{}'::text[]))[1],
       NEW.platform, v_comp, NEW.composer, NEW.music_supervisor,
       coalesce((coalesce(NEW.countries,'{}'::text[]))[1], 'ES'),
       'finalizada'::production_status, true,
       'Alta automática desde CRM Producciones españolas')
    returning id into v_prod;
  end if;

  if NEW.produccion_ic_vinculada is distinct from v_prod then
    update public.producciones_espanolas set produccion_ic_vinculada = v_prod where id = NEW.id;
  end if;

  foreach cid in array ids loop
    if not exists (
      select 1 from public.composer_filmography f
       where f.composer_id = cid
         and (f.production_id = v_prod
              or (lower(btrim(f.title)) = lower(btrim(v_title))
                  and coalesce(f.year, -1) = coalesce(NEW.year, -1)))
    ) then
      insert into public.composer_filmography
        (composer_id, title, year, production_company, director, format, country, production_id, platform)
      values
        (cid, v_title, NEW.year,
         (coalesce(NEW.production_companies,'{}'::text[]))[1],
         (coalesce(NEW.directors,'{}'::text[]))[1],
         v_fmt,
         coalesce((coalesce(NEW.countries,'{}'::text[]))[1], 'ES'),
         v_prod, NEW.platform);
    else
      update public.composer_filmography f
         set production_id = v_prod
       where f.composer_id = cid and f.production_id is null
         and lower(btrim(f.title)) = lower(btrim(v_title));
    end if;
  end loop;

  return NEW;
end $function$;

DROP TRIGGER IF EXISTS pair_ic_commission_sprint_trg ON public.production_billing_sprints;
COMMENT ON FUNCTION public.pair_ic_commission_sprint() IS 'DEPRECATED: commission sprints are now independent from representative sprints';