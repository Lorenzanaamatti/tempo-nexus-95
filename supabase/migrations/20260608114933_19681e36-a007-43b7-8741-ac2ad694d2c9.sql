
-- Add new production kinds
ALTER TYPE public.production_kind ADD VALUE IF NOT EXISTS 'programa_tv';
ALTER TYPE public.production_kind ADD VALUE IF NOT EXISTS 'teatro';
ALTER TYPE public.production_kind ADD VALUE IF NOT EXISTS 'produccion_especial';

-- Clarification text for "Producción especial"
ALTER TABLE public.productions
  ADD COLUMN IF NOT EXISTS project_type_note text;
