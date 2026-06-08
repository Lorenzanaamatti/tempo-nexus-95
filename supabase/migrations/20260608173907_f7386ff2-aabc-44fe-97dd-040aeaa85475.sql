
ALTER TYPE public.opportunity_status ADD VALUE IF NOT EXISTS 'sin_contacto';
ALTER TYPE public.opportunity_status ADD VALUE IF NOT EXISTS 'contactado';
ALTER TYPE public.opportunity_status ADD VALUE IF NOT EXISTS 'reunion';
ALTER TYPE public.opportunity_status ADD VALUE IF NOT EXISTS 'cliente_activo';
ALTER TYPE public.opportunity_status ADD VALUE IF NOT EXISTS 'en_pausa';

ALTER TYPE public.opportunity_kind ADD VALUE IF NOT EXISTS 'fichaje_productora';
