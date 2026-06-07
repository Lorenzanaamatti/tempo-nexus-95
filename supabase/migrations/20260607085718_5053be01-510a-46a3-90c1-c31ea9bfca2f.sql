ALTER TABLE public.opportunities
  ADD CONSTRAINT opportunities_target_production_id_fkey
  FOREIGN KEY (target_production_id) REFERENCES public.productions(id) ON DELETE SET NULL;