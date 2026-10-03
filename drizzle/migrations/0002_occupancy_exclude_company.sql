CREATE OR REPLACE FUNCTION public.roster_occupancy_months(_months integer DEFAULT 12)
 RETURNS TABLE(composer_id uuid, month date, has_production boolean, has_billing boolean, has_negotiation boolean, billing_amount numeric)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH m AS (
    SELECT (date_trunc('month', current_date) + (g || ' month')::interval)::date AS ms
    FROM generate_series(0, greatest(1, least(_months, 36)) - 1) g
  ), c AS (
    SELECT id FROM composers WHERE representation_status IN ('activo','pausa') AND coalesce(roster_role::text,'') <> 'ic_company'
  ), prod AS (
    SELECT DISTINCT x.cid, x.p_start, x.p_end FROM (
      SELECT p.composer_id cid, coalesce(p.start_date, p.created_at::date) p_start,
             coalesce(p.actual_delivery_date, p.delivery_date, coalesce(p.start_date, p.created_at::date) + 90) p_end
      FROM productions p WHERE p.composer_id IS NOT NULL AND coalesce(p.is_historical,false) = false
      UNION ALL
      SELECT a.composer_id, coalesce(a.start_date, p.start_date, p.created_at::date),
             coalesce(a.end_date, p.delivery_date, coalesce(a.start_date, p.start_date, p.created_at::date) + 90)
      FROM production_assignments a JOIN productions p ON p.id = a.production_id WHERE a.composer_id IS NOT NULL
      UNION ALL
      SELECT p.composer_id, ph.start_date, coalesce(ph.end_date, ph.start_date)
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
    WHERE NOT (coalesce(o.statuses::text[], '{}'::text[]) && ARRAY['cerrado','descartado','cliente_activo']::text[])
  )
  SELECT c.id, m.ms,
    EXISTS (SELECT 1 FROM prod WHERE prod.cid = c.id AND prod.p_start < (m.ms + interval '1 month')::date AND prod.p_end >= m.ms),
    EXISTS (SELECT 1 FROM bill WHERE bill.cid = c.id AND bill.ms = m.ms),
    EXISTS (SELECT 1 FROM neg WHERE neg.cid = c.id AND neg.n_start < (m.ms + interval '1 month')::date AND neg.n_start + 120 >= m.ms),
    coalesce((SELECT amt FROM bill WHERE bill.cid = c.id AND bill.ms = m.ms), 0)
  FROM c CROSS JOIN m
  WHERE public.current_user_is_staff() OR auth.uid() IS NULL;
$function$;