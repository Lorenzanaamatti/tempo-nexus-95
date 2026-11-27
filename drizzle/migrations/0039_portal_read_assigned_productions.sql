CREATE OR REPLACE FUNCTION public.can_access_production(_production_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM productions p WHERE p.id=_production_id AND p.composer_id IS NOT NULL AND can_access_composer(p.composer_id))
      OR EXISTS (SELECT 1 FROM production_assignments a WHERE a.production_id=_production_id AND a.composer_id IS NOT NULL AND can_access_composer(a.composer_id));
$$;
DROP POLICY IF EXISTS "productions staff read" ON public.productions;
CREATE POLICY "productions staff read" ON public.productions FOR SELECT TO authenticated
USING (current_user_is_staff() OR public.can_access_production(id));
DROP POLICY IF EXISTS "finance_lines read" ON public.production_finance_lines;
CREATE POLICY "finance_lines read" ON public.production_finance_lines FOR SELECT TO authenticated
USING (current_user_is_staff() OR public.can_access_production(production_id));