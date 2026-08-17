UPDATE public.actions a SET assignee_person_id = NULL
WHERE assignee_person_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.people p WHERE p.id = a.assignee_person_id);

ALTER TABLE public.actions
  ADD CONSTRAINT actions_assignee_person_id_fkey
  FOREIGN KEY (assignee_person_id) REFERENCES public.people(id) ON DELETE SET NULL;

NOTIFY pgrst, 'reload schema';