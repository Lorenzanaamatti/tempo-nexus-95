CREATE OR REPLACE FUNCTION public.sync_production_composer_assignment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.composer_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.production_assignments a
    WHERE a.production_id = NEW.id AND a.composer_id = NEW.composer_id
  ) THEN
    INSERT INTO public.production_assignments (production_id, composer_id, role_in_project)
    VALUES (NEW.id, NEW.composer_id, 'compositor_principal');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_production_composer_assignment ON public.productions;
CREATE TRIGGER trg_sync_production_composer_assignment
AFTER INSERT OR UPDATE OF composer_id ON public.productions
FOR EACH ROW EXECUTE FUNCTION public.sync_production_composer_assignment();

INSERT INTO public.production_assignments (production_id, composer_id, role_in_project)
SELECT p.id, p.composer_id, 'compositor_principal' FROM public.productions p
WHERE p.composer_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM public.production_assignments a WHERE a.production_id = p.id AND a.composer_id = p.composer_id);