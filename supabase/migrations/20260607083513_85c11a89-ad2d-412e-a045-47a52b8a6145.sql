CREATE TYPE public.opportunity_kind AS ENUM ('fichaje', 'pitch');
ALTER TABLE public.opportunities
  ADD COLUMN kind public.opportunity_kind NOT NULL DEFAULT 'pitch',
  ADD COLUMN target_production_id uuid NULL,
  ADD COLUMN target_production_text text NULL;