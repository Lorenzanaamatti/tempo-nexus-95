ALTER TABLE public.actions ADD COLUMN IF NOT EXISTS client text;
UPDATE public.actions SET client = btrim(substring(notes from 'Cliente: ([^\n]+)')) WHERE client IS NULL AND notes ~ 'Cliente: ';