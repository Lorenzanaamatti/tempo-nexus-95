DELETE FROM public.calendar_events e
WHERE
  (e.subject_type = 'production' AND e.subject_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.productions p WHERE p.id = e.subject_id))
  OR (e.source_production_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.productions p WHERE p.id = e.source_production_id))
  OR (e.subject_type = 'opportunity' AND e.subject_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.opportunities o WHERE o.id = e.subject_id))
  OR (e.source_opportunity_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.opportunities o WHERE o.id = e.source_opportunity_id))
  OR (e.subject_type = 'contract' AND e.subject_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = e.subject_id))
  OR (e.source_contract_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = e.source_contract_id))
  OR (e.subject_type = 'composer' AND e.subject_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.composers c WHERE c.id = e.subject_id))
  OR (e.source_composer_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.composers c WHERE c.id = e.source_composer_id))
  OR (e.subject_type = 'person' AND e.subject_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.people p WHERE p.id = e.subject_id))
  OR (e.assignee_person_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.people p WHERE p.id = e.assignee_person_id))
  OR (e.source_action_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.actions a WHERE a.id = e.source_action_id))
  OR (e.source_opp_action_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.opportunity_actions oa WHERE oa.id = e.source_opp_action_id))
  OR (e.source_phase_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.production_phases pp WHERE pp.id = e.source_phase_id))
  OR (e.source_sprint_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.production_billing_sprints pbs WHERE pbs.id = e.source_sprint_id));