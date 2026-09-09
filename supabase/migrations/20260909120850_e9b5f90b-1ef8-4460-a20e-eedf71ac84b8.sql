-- 1) Staff helper
CREATE OR REPLACE FUNCTION public.current_user_is_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'team') $$;

-- 2) Open staff access on core CRM tables
DROP POLICY IF EXISTS "opportunities read" ON public.opportunities;
DROP POLICY IF EXISTS "opportunities admin write" ON public.opportunities;
CREATE POLICY "opportunities staff read" ON public.opportunities FOR SELECT TO authenticated USING (public.current_user_is_staff());
CREATE POLICY "opportunities staff write" ON public.opportunities FOR ALL TO authenticated USING (public.current_user_is_staff()) WITH CHECK (public.current_user_is_staff());

DROP POLICY IF EXISTS "opp_actions read" ON public.opportunity_actions;
DROP POLICY IF EXISTS "opp_actions admin write" ON public.opportunity_actions;
CREATE POLICY "opp_actions staff read" ON public.opportunity_actions FOR SELECT TO authenticated USING (public.current_user_is_staff());
CREATE POLICY "opp_actions staff write" ON public.opportunity_actions FOR ALL TO authenticated USING (public.current_user_is_staff()) WITH CHECK (public.current_user_is_staff());

DROP POLICY IF EXISTS "opportunity_candidates read" ON public.opportunity_candidates;
DROP POLICY IF EXISTS "opp_candidates admin write" ON public.opportunity_candidates;
CREATE POLICY "opp_candidates staff read" ON public.opportunity_candidates FOR SELECT TO authenticated USING (public.current_user_is_staff() OR public.can_access_composer(composer_id));
CREATE POLICY "opp_candidates staff write" ON public.opportunity_candidates FOR ALL TO authenticated USING (public.current_user_is_staff()) WITH CHECK (public.current_user_is_staff());

DROP POLICY IF EXISTS "prod_companies read" ON public.production_companies;
DROP POLICY IF EXISTS "prod_companies admin write" ON public.production_companies;
CREATE POLICY "prod_companies staff read" ON public.production_companies FOR SELECT TO authenticated USING (public.current_user_is_staff());
CREATE POLICY "prod_companies staff write" ON public.production_companies FOR ALL TO authenticated USING (public.current_user_is_staff()) WITH CHECK (public.current_user_is_staff());

DROP POLICY IF EXISTS "directors read" ON public.directors;
DROP POLICY IF EXISTS "directors admin write" ON public.directors;
CREATE POLICY "directors staff read" ON public.directors FOR SELECT TO authenticated USING (public.current_user_is_staff());
CREATE POLICY "directors staff write" ON public.directors FOR ALL TO authenticated USING (public.current_user_is_staff()) WITH CHECK (public.current_user_is_staff());

DROP POLICY IF EXISTS "platforms read" ON public.platforms;
DROP POLICY IF EXISTS "platforms admin write" ON public.platforms;
CREATE POLICY "platforms staff read" ON public.platforms FOR SELECT TO authenticated USING (public.current_user_is_staff());
CREATE POLICY "platforms staff write" ON public.platforms FOR ALL TO authenticated USING (public.current_user_is_staff()) WITH CHECK (public.current_user_is_staff());

DROP POLICY IF EXISTS "productions read" ON public.productions;
DROP POLICY IF EXISTS "productions admin write" ON public.productions;
CREATE POLICY "productions staff read" ON public.productions FOR SELECT TO authenticated USING (public.current_user_is_staff() OR (composer_id IS NOT NULL AND public.can_access_composer(composer_id)));
CREATE POLICY "productions staff write" ON public.productions FOR ALL TO authenticated USING (public.current_user_is_staff()) WITH CHECK (public.current_user_is_staff());

DROP POLICY IF EXISTS "phases admin all" ON public.production_phases;
CREATE POLICY "phases staff all" ON public.production_phases FOR ALL TO authenticated USING (public.current_user_is_staff()) WITH CHECK (public.current_user_is_staff());

-- 3) Security hardening
DROP POLICY IF EXISTS "audit_log_select_authenticated" ON public.audit_log;
CREATE POLICY "audit_log big c read" ON public.audit_log FOR SELECT TO authenticated USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "Team can view press opportunities" ON public.oportunidades_prensa;
DROP POLICY IF EXISTS "Team can manage press opportunities" ON public.oportunidades_prensa;
CREATE POLICY "prensa staff read" ON public.oportunidades_prensa FOR SELECT TO authenticated USING (public.current_user_is_staff());
CREATE POLICY "prensa staff write" ON public.oportunidades_prensa FOR ALL TO authenticated USING (public.current_user_is_staff()) WITH CHECK (public.current_user_is_staff());

-- 4) Contacts per company
CREATE TABLE public.company_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_company_id uuid REFERENCES public.production_companies(id) ON DELETE CASCADE,
  partner_id uuid REFERENCES public.partners(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  role_title text,
  email text,
  phone text,
  notes text,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_contacts TO authenticated;
GRANT ALL ON public.company_contacts TO service_role;
ALTER TABLE public.company_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_contacts staff read" ON public.company_contacts FOR SELECT TO authenticated USING (public.current_user_is_staff());
CREATE POLICY "company_contacts staff write" ON public.company_contacts FOR ALL TO authenticated USING (public.current_user_is_staff()) WITH CHECK (public.current_user_is_staff());
CREATE INDEX company_contacts_company_idx ON public.company_contacts(production_company_id);
CREATE INDEX company_contacts_partner_idx ON public.company_contacts(partner_id);
CREATE TRIGGER company_contacts_touch BEFORE UPDATE ON public.company_contacts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 5) Production expenses
CREATE TABLE public.production_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_id uuid NOT NULL REFERENCES public.productions(id) ON DELETE CASCADE,
  composer_id uuid REFERENCES public.composers(id) ON DELETE SET NULL,
  concepto text NOT NULL,
  description text,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  expense_date date,
  provider_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_expenses TO authenticated;
GRANT ALL ON public.production_expenses TO service_role;
ALTER TABLE public.production_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "production_expenses read" ON public.production_expenses FOR SELECT TO authenticated
  USING (public.current_user_is_staff() OR EXISTS (SELECT 1 FROM public.productions p WHERE p.id = production_id AND p.composer_id IS NOT NULL AND public.can_access_composer(p.composer_id)));
CREATE POLICY "production_expenses staff write" ON public.production_expenses FOR ALL TO authenticated USING (public.current_user_is_staff()) WITH CHECK (public.current_user_is_staff());
CREATE INDEX production_expenses_production_idx ON public.production_expenses(production_id);
CREATE TRIGGER production_expenses_touch BEFORE UPDATE ON public.production_expenses FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 6) Phase metadata
ALTER TABLE public.production_phases
  ADD COLUMN IF NOT EXISTS is_milestone boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS template_key text;

-- 7) Phase calendar: allow start-only phases
CREATE OR REPLACE FUNCTION public.sync_production_phase_calendar()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _title text; _start date; _end date;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.calendar_events WHERE source_phase_id = OLD.id;
    RETURN OLD;
  END IF;
  DELETE FROM public.calendar_events WHERE source_phase_id = NEW.id;
  _start := COALESCE(NEW.start_date, NEW.end_date);
  _end := COALESCE(NEW.end_date, NEW.start_date);
  IF _start IS NULL THEN RETURN NEW; END IF;
  SELECT title INTO _title FROM public.productions WHERE id = NEW.production_id;
  INSERT INTO public.calendar_events (subject_type, subject_id, kind, calendar_category, start_date, end_date, title, note, source_phase_id, source_kind)
  VALUES ('production', NEW.production_id, 'produccion_fase', 'operativo', _start, _end,
          'Fase · ' || NEW.name || ' — ' || COALESCE(_title,''), NEW.notes, NEW.id, 'production_phase');
  RETURN NEW;
END $$;

-- 8) Companies <-> partners sync
CREATE OR REPLACE FUNCTION public.sync_company_to_partner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _pid uuid;
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
  SELECT id INTO _pid FROM public.partners
   WHERE (source_table = 'production_companies' AND source_id = NEW.id)
      OR (tipo = 'Productora'::partner_tipo AND lower(btrim(nombre)) = lower(btrim(NEW.name)))
   LIMIT 1;
  IF _pid IS NULL THEN
    INSERT INTO public.partners (tipo, nombre, pais, ciudad, website, contacto_principal, contacto_email, contacto_telefono, notas, source_table, source_id)
    VALUES ('Productora'::partner_tipo, NEW.name, NEW.country, NEW.city, NEW.website, NEW.contact_name, NEW.email, NEW.phone, NEW.notes, 'production_companies', NEW.id);
  ELSE
    UPDATE public.partners SET
      nombre = NEW.name,
      pais = COALESCE(NEW.country, pais),
      ciudad = COALESCE(NEW.city, ciudad),
      website = COALESCE(NEW.website, website),
      contacto_principal = COALESCE(NEW.contact_name, contacto_principal),
      contacto_email = COALESCE(NEW.email, contacto_email),
      contacto_telefono = COALESCE(NEW.phone, contacto_telefono),
      source_table = 'production_companies',
      source_id = NEW.id,
      updated_at = now()
    WHERE id = _pid;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS prod_companies_sync_partner ON public.production_companies;
CREATE TRIGGER prod_companies_sync_partner AFTER INSERT OR UPDATE ON public.production_companies
FOR EACH ROW EXECUTE FUNCTION public.sync_company_to_partner();

CREATE OR REPLACE FUNCTION public.sync_partner_to_company()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _cid uuid;
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
  IF NEW.tipo <> 'Productora'::partner_tipo THEN RETURN NEW; END IF;
  SELECT id INTO _cid FROM public.production_companies
   WHERE id = NEW.source_id OR lower(btrim(name)) = lower(btrim(NEW.nombre)) LIMIT 1;
  IF _cid IS NULL THEN
    INSERT INTO public.production_companies (name, country, city, website, contact_name, email, phone, notes)
    VALUES (NEW.nombre, NEW.pais, NEW.ciudad, NEW.website, NEW.contacto_principal, NEW.contacto_email, NEW.contacto_telefono, NEW.notas)
    RETURNING id INTO _cid;
    UPDATE public.partners SET source_table = 'production_companies', source_id = _cid WHERE id = NEW.id;
  ELSE
    UPDATE public.production_companies SET
      name = NEW.nombre,
      country = COALESCE(NEW.pais, country),
      city = COALESCE(NEW.ciudad, city),
      website = COALESCE(NEW.website, website),
      contact_name = COALESCE(NEW.contacto_principal, contact_name),
      email = COALESCE(NEW.contacto_email, email),
      phone = COALESCE(NEW.contacto_telefono, phone),
      updated_at = now()
    WHERE id = _cid;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS partners_sync_company ON public.partners;
CREATE TRIGGER partners_sync_company AFTER INSERT OR UPDATE ON public.partners
FOR EACH ROW EXECUTE FUNCTION public.sync_partner_to_company();

-- 9) Backfill missing partners from production_companies
INSERT INTO public.partners (tipo, nombre, pais, ciudad, website, contacto_principal, contacto_email, contacto_telefono, notas, source_table, source_id)
SELECT 'Productora'::partner_tipo, pc.name, pc.country, pc.city, pc.website, pc.contact_name, pc.email, pc.phone, pc.notes, 'production_companies', pc.id
FROM public.production_companies pc
WHERE NOT EXISTS (
  SELECT 1 FROM public.partners p
  WHERE (p.source_table = 'production_companies' AND p.source_id = pc.id)
     OR (p.tipo = 'Productora'::partner_tipo AND lower(btrim(p.nombre)) = lower(btrim(pc.name)))
);