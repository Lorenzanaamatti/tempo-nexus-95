CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid,
  action text NOT NULL,
  changed_fields text[] NOT NULL DEFAULT '{}',
  old_values jsonb,
  new_values jsonb,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_select_authenticated" ON public.audit_log
  FOR SELECT TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS audit_log_record_idx ON public.audit_log (table_name, record_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.record_audit_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old jsonb;
  v_new jsonb;
  v_fields text[] := '{}';
  k text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_new := to_jsonb(NEW);
    INSERT INTO public.audit_log(table_name, record_id, action, changed_fields, old_values, new_values, actor_id)
    VALUES (TG_TABLE_NAME, (v_new->>'id')::uuid, 'insert', '{}', NULL, v_new, auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    FOR k IN SELECT jsonb_object_keys(v_new) LOOP
      IF v_new->k IS DISTINCT FROM v_old->k AND k <> 'updated_at' THEN
        v_fields := array_append(v_fields, k);
      END IF;
    END LOOP;
    IF array_length(v_fields, 1) IS NULL THEN
      RETURN NEW;
    END IF;
    INSERT INTO public.audit_log(table_name, record_id, action, changed_fields, old_values, new_values, actor_id)
    VALUES (TG_TABLE_NAME, (v_new->>'id')::uuid, 'update', v_fields,
            (SELECT jsonb_object_agg(f, v_old->f) FROM unnest(v_fields) AS f),
            (SELECT jsonb_object_agg(f, v_new->f) FROM unnest(v_fields) AS f),
            auth.uid());
    RETURN NEW;
  ELSE
    v_old := to_jsonb(OLD);
    INSERT INTO public.audit_log(table_name, record_id, action, changed_fields, old_values, new_values, actor_id)
    VALUES (TG_TABLE_NAME, (v_old->>'id')::uuid, 'delete', '{}', v_old, NULL, auth.uid());
    RETURN OLD;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS audit_deal_memos ON public.deal_memos;
CREATE TRIGGER audit_deal_memos
AFTER INSERT OR UPDATE OR DELETE ON public.deal_memos
FOR EACH ROW EXECUTE FUNCTION public.record_audit_log();

DROP TRIGGER IF EXISTS audit_contracts ON public.contracts;
CREATE TRIGGER audit_contracts
AFTER INSERT OR UPDATE OR DELETE ON public.contracts
FOR EACH ROW EXECUTE FUNCTION public.record_audit_log();