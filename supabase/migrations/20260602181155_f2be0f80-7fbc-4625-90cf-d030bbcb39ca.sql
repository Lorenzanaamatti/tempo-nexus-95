
-- =========================================================
-- 1. Extender calendar_events
-- =========================================================

-- Convertir kind de enum a text para admitir nuevos tipos sin romper el enum existente
ALTER TABLE public.calendar_events
  ALTER COLUMN kind TYPE text USING kind::text;

ALTER TABLE public.calendar_events
  ALTER COLUMN kind SET DEFAULT 'ocupado';

-- Nueva clasificación por área
DO $$ BEGIN
  CREATE TYPE public.calendar_category AS ENUM ('operativo','marketing','facturacion','personal');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS calendar_category public.calendar_category NOT NULL DEFAULT 'operativo',
  ADD COLUMN IF NOT EXISTS assignee_person_id uuid,
  ADD COLUMN IF NOT EXISTS source_action_id uuid,
  ADD COLUMN IF NOT EXISTS source_opp_action_id uuid,
  ADD COLUMN IF NOT EXISTS source_contract_id uuid,
  ADD COLUMN IF NOT EXISTS source_opportunity_id uuid,
  ADD COLUMN IF NOT EXISTS source_target_account_id uuid,
  ADD COLUMN IF NOT EXISTS source_production_id uuid,
  ADD COLUMN IF NOT EXISTS source_social_post_id uuid,
  ADD COLUMN IF NOT EXISTS source_composer_id uuid,
  ADD COLUMN IF NOT EXISTS source_kind text;

CREATE INDEX IF NOT EXISTS idx_cal_events_category ON public.calendar_events(calendar_category);
CREATE INDEX IF NOT EXISTS idx_cal_events_assignee ON public.calendar_events(assignee_person_id);
CREATE INDEX IF NOT EXISTS idx_cal_events_src_action ON public.calendar_events(source_action_id);
CREATE INDEX IF NOT EXISTS idx_cal_events_src_opp_action ON public.calendar_events(source_opp_action_id);
CREATE INDEX IF NOT EXISTS idx_cal_events_src_contract ON public.calendar_events(source_contract_id, source_kind);
CREATE INDEX IF NOT EXISTS idx_cal_events_src_opp ON public.calendar_events(source_opportunity_id);
CREATE INDEX IF NOT EXISTS idx_cal_events_src_tgt ON public.calendar_events(source_target_account_id);
CREATE INDEX IF NOT EXISTS idx_cal_events_src_prod ON public.calendar_events(source_production_id, source_kind);
CREATE INDEX IF NOT EXISTS idx_cal_events_src_social ON public.calendar_events(source_social_post_id);
CREATE INDEX IF NOT EXISTS idx_cal_events_src_composer ON public.calendar_events(source_composer_id, source_kind);

-- =========================================================
-- 2. Helper para upsert mínimo
-- =========================================================
-- Cada trigger borra los eventos del registro origen y los recrea según las fechas vigentes.

-- =========================================================
-- 3. actions (tareas) -> calendar
-- =========================================================
CREATE OR REPLACE FUNCTION public.sync_action_calendar()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _cat public.calendar_category;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.calendar_events WHERE source_action_id = OLD.id;
    RETURN OLD;
  END IF;

  DELETE FROM public.calendar_events WHERE source_action_id = NEW.id;

  IF NEW.due_date IS NULL OR NEW.done THEN
    RETURN NEW;
  END IF;

  _cat := CASE WHEN NEW.assignee_person_id IS NOT NULL THEN 'personal'::public.calendar_category
               ELSE 'operativo'::public.calendar_category END;

  INSERT INTO public.calendar_events (
    subject_type, subject_id, kind, calendar_category,
    start_date, end_date, title, note,
    assignee_person_id, source_action_id, source_kind
  ) VALUES (
    NEW.subject_type, NEW.subject_id, 'tarea', _cat,
    NEW.due_date, NEW.due_date, NEW.title, NEW.notes,
    NEW.assignee_person_id, NEW.id, 'action'
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_action_calendar ON public.actions;
CREATE TRIGGER trg_sync_action_calendar
AFTER INSERT OR UPDATE OR DELETE ON public.actions
FOR EACH ROW EXECUTE FUNCTION public.sync_action_calendar();

-- =========================================================
-- 4. opportunity_actions -> calendar
-- =========================================================
CREATE OR REPLACE FUNCTION public.sync_opp_action_calendar()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.calendar_events WHERE source_opp_action_id = OLD.id;
    RETURN OLD;
  END IF;

  DELETE FROM public.calendar_events WHERE source_opp_action_id = NEW.id;

  IF NEW.due_date IS NULL OR NEW.done THEN RETURN NEW; END IF;

  INSERT INTO public.calendar_events (
    subject_type, subject_id, kind, calendar_category,
    start_date, end_date, title, note,
    source_opp_action_id, source_opportunity_id, source_kind
  ) VALUES (
    'opportunity', NEW.opportunity_id, 'tarea', 'operativo',
    NEW.due_date, NEW.due_date, NEW.title, NEW.notes,
    NEW.id, NEW.opportunity_id, 'opportunity_action'
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_opp_action_calendar ON public.opportunity_actions;
CREATE TRIGGER trg_sync_opp_action_calendar
AFTER INSERT OR UPDATE OR DELETE ON public.opportunity_actions
FOR EACH ROW EXECUTE FUNCTION public.sync_opp_action_calendar();

-- =========================================================
-- 5. contracts -> calendar (firma, preaviso, fin)
-- =========================================================
CREATE OR REPLACE FUNCTION public.sync_contract_calendar()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _subj_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.calendar_events WHERE source_contract_id = OLD.id;
    RETURN OLD;
  END IF;

  DELETE FROM public.calendar_events WHERE source_contract_id = NEW.id;
  _subj_id := COALESCE(NEW.composer_id, NEW.signer_composer_id);
  IF _subj_id IS NULL THEN RETURN NEW; END IF;

  IF NEW.signed_date IS NOT NULL THEN
    INSERT INTO public.calendar_events (subject_type, subject_id, kind, calendar_category, start_date, end_date, title, source_contract_id, source_kind)
    VALUES ('composer', _subj_id, 'contrato_firma', 'operativo', NEW.signed_date, NEW.signed_date, 'Firma · ' || NEW.title, NEW.id, 'contract_signed');
  END IF;

  IF NEW.notice_date IS NOT NULL THEN
    INSERT INTO public.calendar_events (subject_type, subject_id, kind, calendar_category, start_date, end_date, title, source_contract_id, source_kind)
    VALUES ('composer', _subj_id, 'contrato_preaviso', 'operativo', NEW.notice_date, NEW.notice_date, 'Preaviso · ' || NEW.title, NEW.id, 'contract_notice');
  END IF;

  IF NEW.end_date IS NOT NULL THEN
    INSERT INTO public.calendar_events (subject_type, subject_id, kind, calendar_category, start_date, end_date, title, source_contract_id, source_kind)
    VALUES ('composer', _subj_id, 'contrato_fin', 'operativo', NEW.end_date, NEW.end_date, 'Fin contrato · ' || NEW.title, NEW.id, 'contract_end');
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_contract_calendar ON public.contracts;
CREATE TRIGGER trg_sync_contract_calendar
AFTER INSERT OR UPDATE OR DELETE ON public.contracts
FOR EACH ROW EXECUTE FUNCTION public.sync_contract_calendar();

-- =========================================================
-- 6. opportunities.expected_close_date -> calendar
-- =========================================================
CREATE OR REPLACE FUNCTION public.sync_opportunity_calendar()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.calendar_events WHERE source_opportunity_id = OLD.id AND source_kind = 'opportunity_close';
    RETURN OLD;
  END IF;

  DELETE FROM public.calendar_events WHERE source_opportunity_id = NEW.id AND source_kind = 'opportunity_close';
  IF NEW.expected_close_date IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.calendar_events (subject_type, subject_id, kind, calendar_category, start_date, end_date, title, source_opportunity_id, source_kind)
  VALUES ('opportunity', NEW.id, 'oportunidad_cierre', 'operativo', NEW.expected_close_date, NEW.expected_close_date, 'Cierre estimado · ' || NEW.title, NEW.id, 'opportunity_close');

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_opportunity_calendar ON public.opportunities;
CREATE TRIGGER trg_sync_opportunity_calendar
AFTER INSERT OR UPDATE OR DELETE ON public.opportunities
FOR EACH ROW EXECUTE FUNCTION public.sync_opportunity_calendar();

-- =========================================================
-- 7. productions: delivery_date, premiere_date -> calendar
-- =========================================================
CREATE OR REPLACE FUNCTION public.sync_production_calendar()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.calendar_events WHERE source_production_id = OLD.id AND source_kind IN ('prod_delivery','prod_premiere');
    RETURN OLD;
  END IF;

  DELETE FROM public.calendar_events WHERE source_production_id = NEW.id AND source_kind IN ('prod_delivery','prod_premiere');

  IF NEW.delivery_date IS NOT NULL THEN
    INSERT INTO public.calendar_events (subject_type, subject_id, kind, calendar_category, start_date, end_date, title, source_production_id, source_kind)
    VALUES ('production', NEW.id, 'entrega', 'operativo', NEW.delivery_date, NEW.delivery_date, 'Entrega · ' || NEW.title, NEW.id, 'prod_delivery');
  END IF;

  IF NEW.premiere_date IS NOT NULL THEN
    INSERT INTO public.calendar_events (subject_type, subject_id, kind, calendar_category, start_date, end_date, title, source_production_id, source_kind)
    VALUES ('production', NEW.id, 'estreno', 'marketing', NEW.premiere_date, NEW.premiere_date, 'Estreno · ' || NEW.title, NEW.id, 'prod_premiere');
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_production_calendar ON public.productions;
CREATE TRIGGER trg_sync_production_calendar
AFTER INSERT OR UPDATE OR DELETE ON public.productions
FOR EACH ROW EXECUTE FUNCTION public.sync_production_calendar();

-- =========================================================
-- 8. composers: representation_start_date -> check-ins 30/60/90 + Lou 90
-- =========================================================
CREATE OR REPLACE FUNCTION public.sync_composer_onboarding_calendar()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.calendar_events
      WHERE source_composer_id = OLD.id
        AND source_kind IN ('checkin_30','checkin_60','checkin_90','lou_90');
    RETURN OLD;
  END IF;

  DELETE FROM public.calendar_events
    WHERE source_composer_id = NEW.id
      AND source_kind IN ('checkin_30','checkin_60','checkin_90','lou_90');

  IF NEW.representation_start_date IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.calendar_events (subject_type, subject_id, kind, calendar_category, start_date, end_date, title, source_composer_id, source_kind)
  VALUES
    ('composer', NEW.id, 'tarea', 'marketing', NEW.representation_start_date + 30, NEW.representation_start_date + 30, 'Check-in 30 días · ' || NEW.full_name, NEW.id, 'checkin_30'),
    ('composer', NEW.id, 'tarea', 'marketing', NEW.representation_start_date + 60, NEW.representation_start_date + 60, 'Check-in 60 días · ' || NEW.full_name, NEW.id, 'checkin_60'),
    ('composer', NEW.id, 'tarea', 'marketing', NEW.representation_start_date + 90, NEW.representation_start_date + 90, 'Check-in 90 días · ' || NEW.full_name, NEW.id, 'checkin_90'),
    ('composer', NEW.id, 'tarea', 'marketing', NEW.representation_start_date + 90, NEW.representation_start_date + 90, 'Recordatorio Lou 90 días · ' || NEW.full_name, NEW.id, 'lou_90');

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_composer_onboarding_calendar ON public.composers;
CREATE TRIGGER trg_sync_composer_onboarding_calendar
AFTER INSERT OR UPDATE OF representation_start_date OR DELETE ON public.composers
FOR EACH ROW EXECUTE FUNCTION public.sync_composer_onboarding_calendar();

-- =========================================================
-- 9. Backfill inicial para datos existentes
-- =========================================================
UPDATE public.actions SET updated_at = now() WHERE due_date IS NOT NULL AND NOT done;
UPDATE public.opportunity_actions SET updated_at = now() WHERE due_date IS NOT NULL AND NOT done;
UPDATE public.contracts SET updated_at = now() WHERE signed_date IS NOT NULL OR notice_date IS NOT NULL OR end_date IS NOT NULL;
UPDATE public.opportunities SET updated_at = now() WHERE expected_close_date IS NOT NULL;
UPDATE public.productions SET updated_at = now() WHERE delivery_date IS NOT NULL OR premiere_date IS NOT NULL;
UPDATE public.composers SET updated_at = now() WHERE representation_start_date IS NOT NULL;
