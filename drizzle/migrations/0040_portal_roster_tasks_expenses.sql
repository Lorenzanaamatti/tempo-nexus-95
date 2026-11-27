ALTER TABLE public.production_finance_lines ADD COLUMN IF NOT EXISTS paid_by_agency boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.portal_set_expense_invoice_flags(_line_id uuid, _issued boolean, _settled boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _pid uuid; _kind text;
BEGIN
  SELECT production_id, kind INTO _pid, _kind FROM production_finance_lines WHERE id = _line_id;
  IF _pid IS NULL OR _kind <> 'gasto' THEN RAISE EXCEPTION 'Línea no válida'; END IF;
  IF NOT (current_user_is_staff() OR can_access_production(_pid)) THEN RAISE EXCEPTION 'Sin permiso'; END IF;
  UPDATE production_finance_lines SET invoice_issued = COALESCE(_issued, invoice_issued), invoice_settled = COALESCE(_settled, invoice_settled) WHERE id = _line_id;
END $$;
REVOKE ALL ON FUNCTION public.portal_set_expense_invoice_flags(uuid, boolean, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.portal_set_expense_invoice_flags(uuid, boolean, boolean) TO authenticated;

DROP POLICY IF EXISTS "phases composer read" ON public.production_phases;
CREATE POLICY "phases composer read" ON public.production_phases FOR SELECT TO authenticated
USING (public.can_access_production(production_id));

CREATE OR REPLACE FUNCTION public.portal_my_tasks(_composer_id uuid)
RETURNS TABLE(id uuid, title text, notes text, due_date date, done boolean, production_id uuid, production_title text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id, a.title, a.notes, a.due_date, a.done, a.production_id, p.title
  FROM actions a JOIN people pe ON pe.id = a.assignee_person_id
  LEFT JOIN productions p ON p.id = a.production_id
  WHERE pe.composer_id = _composer_id AND can_access_composer(_composer_id)
  ORDER BY a.done, a.due_date NULLS LAST;
$$;
REVOKE ALL ON FUNCTION public.portal_my_tasks(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.portal_my_tasks(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.portal_set_task_done(_task_id uuid, _done boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM actions a JOIN people pe ON pe.id = a.assignee_person_id
                 WHERE a.id = _task_id AND pe.composer_id IS NOT NULL AND can_access_composer(pe.composer_id)) THEN
    RAISE EXCEPTION 'Sin permiso';
  END IF;
  UPDATE actions SET done = _done, done_at = CASE WHEN _done THEN now() ELSE NULL END WHERE id = _task_id;
END $$;
REVOKE ALL ON FUNCTION public.portal_set_task_done(uuid, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.portal_set_task_done(uuid, boolean) TO authenticated;