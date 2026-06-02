
CREATE TABLE public.actions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_type public.calendar_subject_type NOT NULL,
  subject_id uuid NOT NULL,
  title text NOT NULL,
  notes text,
  kind text NOT NULL DEFAULT 'tarea',
  due_date date,
  done boolean NOT NULL DEFAULT false,
  done_at timestamptz,
  assignee_person_id uuid,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_actions_subject ON public.actions(subject_type, subject_id);
CREATE INDEX idx_actions_due ON public.actions(due_date) WHERE done = false;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.actions TO authenticated;
GRANT ALL ON public.actions TO service_role;

ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "actions read" ON public.actions FOR SELECT TO authenticated USING (true);
CREATE POLICY "actions admin write" ON public.actions FOR ALL TO authenticated
  USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());

CREATE TRIGGER trg_actions_touch BEFORE UPDATE ON public.actions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.actions (id, subject_type, subject_id, title, notes, kind, due_date, done, done_at, created_at, updated_at)
SELECT id, 'opportunity'::public.calendar_subject_type, opportunity_id, title, notes,
       'tarea', due_date, done, done_at, created_at, updated_at
FROM public.opportunity_actions;

CREATE TABLE public.documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_type public.calendar_subject_type NOT NULL,
  subject_id uuid NOT NULL,
  title text NOT NULL,
  kind text,
  url text,
  storage_path text,
  notes text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_documents_subject ON public.documents(subject_type, subject_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "documents read" ON public.documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "documents admin write" ON public.documents FOR ALL TO authenticated
  USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());

CREATE TRIGGER trg_documents_touch BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.documents (id, subject_type, subject_id, title, kind, url, storage_path, notes, position, created_at, updated_at)
SELECT id, 'composer'::public.calendar_subject_type, composer_id, title, kind, url, storage_path, notes, position, created_at, now()
FROM public.composer_documents;

INSERT INTO public.documents (id, subject_type, subject_id, title, kind, url, storage_path, notes, position, created_at, updated_at)
SELECT id, 'production'::public.calendar_subject_type, production_id, title, kind, url, storage_path, notes, position, created_at, now()
FROM public.production_documents;
