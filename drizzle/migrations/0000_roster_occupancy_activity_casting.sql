ALTER TABLE public.composers
  ADD COLUMN IF NOT EXISTS fee_min numeric,
  ADD COLUMN IF NOT EXISTS fee_max numeric,
  ADD COLUMN IF NOT EXISTS fee_notes text;

CREATE TABLE public.composer_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  composer_id uuid NOT NULL REFERENCES public.composers(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'gestion',
  title text NOT NULL,
  detail text,
  happened_on date NOT NULL DEFAULT current_date,
  counterpart text,
  production_id uuid REFERENCES public.productions(id) ON DELETE SET NULL,
  pitch_id uuid REFERENCES public.oportunidades_pitches(id) ON DELETE SET NULL,
  opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE SET NULL,
  visible_to_artist boolean NOT NULL DEFAULT true,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.composer_activity_log TO authenticated;
GRANT ALL ON public.composer_activity_log TO service_role;
ALTER TABLE public.composer_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage activity log" ON public.composer_activity_log
  FOR ALL TO authenticated USING (public.current_user_is_staff()) WITH CHECK (public.current_user_is_staff());
CREATE POLICY "Artist reads own visible activity" ON public.composer_activity_log
  FOR SELECT TO authenticated USING (visible_to_artist AND EXISTS (
    SELECT 1 FROM public.composers c WHERE c.id = composer_id AND c.owner_user_id = auth.uid()));
CREATE INDEX composer_activity_log_composer_idx ON public.composer_activity_log(composer_id, happened_on DESC);

-- Ocupación mensual del roster: producción, cobros previstos y negociaciones por mes.
CREATE OR REPLACE FUNCTION public.roster_occupancy_months(_months integer DEFAULT 12)
RETURNS TABLE(composer_id uuid, month date, has_production boolean, has_billing boolean, has_negotiation boolean, billing_amount numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH m AS (
    SELECT (date_trunc('month', current_date) + (g || ' month')::interval)::date AS ms
    FROM generate_series(0, greatest(1, least(_months, 36)) - 1) g
  ), c AS (
    SELECT id FROM composers WHERE representation_status IN ('activo','pausa')
  ), prod AS (
    SELECT DISTINCT x.cid, x.p_start, x.p_end FROM (
      SELECT p.composer_id cid, p.id pid, coalesce(p.start_date, p.created_at::date) p_start,
             coalesce(p.actual_delivery_date, p.delivery_date, coalesce(p.start_date, p.created_at::date) + 90) p_end, p.status
      FROM productions p WHERE p.composer_id IS NOT NULL AND coalesce(p.is_historical,false) = false
      UNION ALL
      SELECT a.composer_id, a.production_id, coalesce(a.start_date, p.start_date, p.created_at::date),
             coalesce(a.end_date, p.delivery_date, coalesce(a.start_date, p.start_date, p.created_at::date) + 90), p.status
      FROM production_assignments a JOIN productions p ON p.id = a.production_id WHERE a.composer_id IS NOT NULL
      UNION ALL
      SELECT p.composer_id, p.id, ph.start_date, coalesce(ph.end_date, ph.start_date), p.status
      FROM production_phases ph JOIN productions p ON p.id = ph.production_id
      WHERE p.composer_id IS NOT NULL AND ph.start_date IS NOT NULL
    ) x
  ), bill AS (
    SELECT p.composer_id cid, date_trunc('month', coalesce(s.planned_invoice_date, s.due_date))::date ms, sum(coalesce(s.amount,0)) amt
    FROM production_billing_sprints s JOIN productions p ON p.id = s.production_id
    WHERE p.composer_id IS NOT NULL AND coalesce(s.planned_invoice_date, s.due_date) IS NOT NULL AND s.kind = 'trabajo'
    GROUP BY 1, 2
  ), neg AS (
    SELECT pc.composer_id cid, greatest(coalesce(pi.fecha_seguimiento, pi.fecha_pitch, current_date), current_date) n_start
    FROM oportunidades_pitch_composers pc JOIN oportunidades_pitches pi ON pi.id = pc.pitch_id
    WHERE pi.archivado_at IS NULL
    UNION ALL
    SELECT oc.composer_id, greatest(coalesce(o.expected_close_date, current_date), current_date)
    FROM opportunity_candidates oc JOIN opportunities o ON o.id = oc.opportunity_id
    WHERE NOT (coalesce(o.statuses, '{}'::opportunity_status[])::text[] && ARRAY['perdida','ganada','descartada','cerrada']::text[])
  )
  SELECT c.id, m.ms,
    EXISTS (SELECT 1 FROM prod WHERE prod.cid = c.id AND prod.p_start < (m.ms + interval '1 month')::date AND prod.p_end >= m.ms),
    EXISTS (SELECT 1 FROM bill WHERE bill.cid = c.id AND bill.ms = m.ms),
    EXISTS (SELECT 1 FROM neg WHERE neg.cid = c.id AND neg.n_start < (m.ms + interval '1 month')::date AND neg.n_start + 120 >= m.ms),
    coalesce((SELECT amt FROM bill WHERE bill.cid = c.id AND bill.ms = m.ms), 0)
  FROM c CROSS JOIN m
  WHERE public.current_user_is_staff() OR auth.uid() IS NULL;
$$;
REVOKE ALL ON FUNCTION public.roster_occupancy_months(integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.roster_occupancy_months(integer) TO authenticated, service_role;

-- Aviso: tres meses seguidos sin producción, cobro ni negociación.
CREATE OR REPLACE FUNCTION public.notify_roster_income_gaps()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; n integer := 0; u record;
BEGIN
  FOR r IN
    WITH o AS (
      SELECT composer_id, month, (has_production OR has_billing OR has_negotiation) covered
      FROM public.roster_occupancy_months(12)
    ), w AS (
      SELECT composer_id, month,
        bool_or(covered) OVER (PARTITION BY composer_id ORDER BY month ROWS BETWEEN CURRENT ROW AND 2 FOLLOWING) any_cov,
        count(*) OVER (PARTITION BY composer_id ORDER BY month ROWS BETWEEN CURRENT ROW AND 2 FOLLOWING) cnt
      FROM o
    )
    SELECT DISTINCT ON (w.composer_id) w.composer_id, w.month, coalesce(c.artistic_name, c.full_name) nm
    FROM w JOIN composers c ON c.id = w.composer_id
    WHERE NOT w.any_cov AND w.cnt = 3
    ORDER BY w.composer_id, w.month
  LOOP
    FOR u IN SELECT DISTINCT user_id FROM user_roles WHERE role = 'admin' UNION
             SELECT p.user_id FROM composers c JOIN people p ON p.id = c.agent_person_id WHERE c.id = r.composer_id AND p.user_id IS NOT NULL
    LOOP
      IF NOT EXISTS (SELECT 1 FROM notifications nt WHERE nt.user_id = u.user_id AND nt.kind = 'roster_income_gap'
                     AND nt.link = '/roster/ocupacion?c=' || r.composer_id AND nt.created_at > now() - interval '7 days') THEN
        INSERT INTO notifications(user_id, kind, title, body, link)
        VALUES (u.user_id, 'roster_income_gap',
          r.nm || ': sin ingresos previstos',
          'No tiene producción, cobros ni negociaciones entre ' || to_char(r.month, 'MM/YYYY') || ' y ' || to_char(r.month + interval '2 month', 'MM/YYYY') || '.',
          '/roster/ocupacion?c=' || r.composer_id);
        n := n + 1;
      END IF;
    END LOOP;
  END LOOP;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.notify_roster_income_gaps() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_roster_income_gaps() TO service_role;

SELECT cron.schedule('roster-income-gaps-weekly', '0 7 * * 1', $$SELECT public.notify_roster_income_gaps();$$);