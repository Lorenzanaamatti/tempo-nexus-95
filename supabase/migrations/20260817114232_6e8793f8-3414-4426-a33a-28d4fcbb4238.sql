
ALTER TABLE public.actions
  ADD COLUMN IF NOT EXISTS assignment_status text NOT NULL DEFAULT 'aceptada',
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS assignment_note text;

DO $$ BEGIN
  ALTER TABLE public.actions ADD CONSTRAINT actions_assignment_status_chk
    CHECK (assignment_status IN ('propuesta','aceptada','rechazada'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  action_id uuid REFERENCES public.actions(id) ON DELETE CASCADE,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
CREATE POLICY "notifications_delete_own" ON public.notifications
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON public.notifications (user_id, read_at, created_at DESC);

-- Notificaciones de asignación / respuesta de tareas
CREATE OR REPLACE FUNCTION public.notify_task_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _assignee_user uuid;
  _requester_name text;
  _assignee_name text;
BEGIN
  IF NEW.kind IS DISTINCT FROM 'tarea' THEN RETURN NEW; END IF;

  -- Nueva asignación (alta o cambio de responsable)
  IF NEW.assignee_person_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.assignee_person_id IS DISTINCT FROM OLD.assignee_person_id) THEN
    SELECT user_id, full_name INTO _assignee_user, _assignee_name
      FROM public.people WHERE id = NEW.assignee_person_id;

    IF _assignee_user IS NOT NULL AND _assignee_user IS DISTINCT FROM NEW.requester_user_id THEN
      NEW.assignment_status := 'propuesta';
      NEW.assigned_at := now();
      NEW.accepted_at := NULL;
      INSERT INTO public.notifications (user_id, kind, title, body, link, action_id)
      VALUES (
        _assignee_user, 'task_assigned',
        'Nueva tarea asignada',
        NEW.title || CASE WHEN NEW.due_date IS NOT NULL THEN ' · entrega ' || to_char(NEW.due_date, 'DD/MM/YYYY') ELSE '' END,
        '/tareas', NEW.id
      );
    ELSE
      NEW.assignment_status := 'aceptada';
      NEW.assigned_at := now();
      NEW.accepted_at := now();
    END IF;
  END IF;

  -- Respuesta del responsable
  IF TG_OP = 'UPDATE'
     AND NEW.assignment_status IS DISTINCT FROM OLD.assignment_status
     AND NEW.assignment_status IN ('aceptada','rechazada')
     AND NEW.requester_user_id IS NOT NULL THEN
    IF NEW.assignment_status = 'aceptada' AND NEW.accepted_at IS NULL THEN
      NEW.accepted_at := now();
    END IF;
    SELECT full_name INTO _assignee_name FROM public.people WHERE id = NEW.assignee_person_id;
    INSERT INTO public.notifications (user_id, kind, title, body, link, action_id)
    VALUES (
      NEW.requester_user_id,
      CASE WHEN NEW.assignment_status = 'aceptada' THEN 'task_accepted' ELSE 'task_rejected' END,
      CASE WHEN NEW.assignment_status = 'aceptada'
           THEN coalesce(_assignee_name, 'El responsable') || ' ha aceptado la tarea'
           ELSE coalesce(_assignee_name, 'El responsable') || ' ha rechazado la tarea' END,
      NEW.title || coalesce(' · ' || NEW.assignment_note, ''),
      '/tareas', NEW.id
    );
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_task_assignment ON public.actions;
CREATE TRIGGER trg_notify_task_assignment
  BEFORE INSERT OR UPDATE ON public.actions
  FOR EACH ROW EXECUTE FUNCTION public.notify_task_assignment();

-- Calendario: si no hay responsable, la tarea cae en el calendario de quien la creó
CREATE OR REPLACE FUNCTION public.sync_action_calendar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cat public.calendar_category;
  _subject_type public.calendar_subject_type;
  _subject_id uuid;
  _person uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.calendar_events WHERE source_action_id = OLD.id;
    RETURN OLD;
  END IF;

  DELETE FROM public.calendar_events WHERE source_action_id = NEW.id;

  IF NEW.due_date IS NULL OR NEW.done THEN
    RETURN NEW;
  END IF;

  _person := NEW.assignee_person_id;
  IF _person IS NULL AND NEW.requester_user_id IS NOT NULL THEN
    SELECT id INTO _person FROM public.people WHERE user_id = NEW.requester_user_id LIMIT 1;
  END IF;

  IF NEW.subject_type IS NOT NULL AND NEW.subject_id IS NOT NULL THEN
    _subject_type := NEW.subject_type;
    _subject_id := NEW.subject_id;
  ELSIF _person IS NOT NULL THEN
    _subject_type := 'person'::public.calendar_subject_type;
    _subject_id := _person;
  ELSE
    RETURN NEW;
  END IF;

  _cat := CASE WHEN _person IS NOT NULL THEN 'personal'::public.calendar_category
               ELSE 'operativo'::public.calendar_category END;

  INSERT INTO public.calendar_events (
    subject_type, subject_id, kind, calendar_category,
    start_date, end_date, title, note,
    assignee_person_id, source_action_id, source_kind
  ) VALUES (
    _subject_type, _subject_id, 'tarea', _cat,
    NEW.due_date, NEW.due_date, NEW.title, NEW.notes,
    _person, NEW.id, 'action'
  );
  RETURN NEW;
END $$;
