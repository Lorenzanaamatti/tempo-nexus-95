ALTER TABLE public.composers
  ADD COLUMN prospect_next_action_date date,
  ADD COLUMN prospect_target_date date;

COMMENT ON COLUMN public.composers.prospect_next_action_date IS 'Próxima acción programada para el perfil en prospección';
COMMENT ON COLUMN public.composers.prospect_target_date IS 'Fecha objetivo de cierre de contratación para el perfil en prospección';