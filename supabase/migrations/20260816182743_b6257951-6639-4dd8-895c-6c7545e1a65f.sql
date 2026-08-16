ALTER TABLE public.actions
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pendiente';

ALTER TABLE public.actions DROP CONSTRAINT IF EXISTS actions_status_check;
ALTER TABLE public.actions
  ADD CONSTRAINT actions_status_check CHECK (status IN ('pendiente','en_curso','bloqueada','hecha'));

UPDATE public.actions SET status = 'hecha' WHERE done = true AND status <> 'hecha';

CREATE OR REPLACE FUNCTION public.actions_sync_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.done THEN NEW.status := 'hecha';
    ELSIF NEW.status = 'hecha' THEN NEW.done := true; NEW.done_at := COALESCE(NEW.done_at, now());
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'hecha' THEN
      NEW.done := true;
      NEW.done_at := COALESCE(NEW.done_at, now());
    ELSE
      NEW.done := false;
      NEW.done_at := NULL;
    END IF;
  ELSIF NEW.done IS DISTINCT FROM OLD.done THEN
    NEW.status := CASE WHEN NEW.done THEN 'hecha' ELSE 'pendiente' END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS actions_sync_status_trg ON public.actions;
CREATE TRIGGER actions_sync_status_trg
BEFORE INSERT OR UPDATE ON public.actions
FOR EACH ROW EXECUTE FUNCTION public.actions_sync_status();

CREATE INDEX IF NOT EXISTS actions_assignee_done_due_idx
  ON public.actions (assignee_person_id, done, due_date);
CREATE INDEX IF NOT EXISTS actions_requester_done_due_idx
  ON public.actions (requester_user_id, done, due_date);