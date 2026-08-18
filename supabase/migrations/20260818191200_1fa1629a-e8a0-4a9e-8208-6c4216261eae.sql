
update public.partners set tipo = 'Productora' where nombre = 'Filmax';
insert into public.partners (nombre, tipo, subtipo)
select v.nombre, 'Plataforma'::public.partner_tipo, 'Plataforma de streaming'
from (values ('Apple TV+'), ('Filmin'), ('Netflix'), ('SkyShowtime'), ('Prime Video')) as v(nombre)
where not exists (select 1 from public.partners p where lower(p.nombre) = lower(v.nombre));
