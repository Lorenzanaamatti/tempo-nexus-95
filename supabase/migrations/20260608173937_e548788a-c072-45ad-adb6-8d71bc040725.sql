
-- 3. Contract direction enum + column
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contract_direction_v2') THEN
    CREATE TYPE public.contract_direction_v2 AS ENUM ('ic_roster','roster_productora','ic_productora');
  END IF;
END$$;

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS direction public.contract_direction_v2;

COMMENT ON COLUMN public.contracts.direction IS
  'Dirección canónica del contrato: ic_roster (IC↔representado), roster_productora (representado↔productora), ic_productora (IC↔productora). Opcional hasta backfill manual.';

-- 4. production_assignments: añadir partner_company_id + CHECK NOT VALID
ALTER TABLE public.production_assignments
  ADD COLUMN IF NOT EXISTS partner_company_id uuid REFERENCES public.production_companies(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'production_assignments_one_subject'
      AND conrelid = 'public.production_assignments'::regclass
  ) THEN
    ALTER TABLE public.production_assignments
      ADD CONSTRAINT production_assignments_one_subject
      CHECK (
        (CASE WHEN composer_id        IS NOT NULL THEN 1 ELSE 0 END)
      + (CASE WHEN person_id          IS NOT NULL THEN 1 ELSE 0 END)
      + (CASE WHEN partner_company_id IS NOT NULL THEN 1 ELSE 0 END)
      = 1
      ) NOT VALID;
  END IF;
END$$;

-- 5. Backfill BAMBU + SECUOYA → opportunities
INSERT INTO public.opportunities (
  id, title, kind, statuses, partner_company_id, partner_name,
  responsible_person_id, detected_date, notes, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  t.name,
  'fichaje_productora'::public.opportunity_kind,
  ARRAY['sin_contacto']::public.opportunity_status[],
  t.production_company_id,
  t.name,
  t.responsible_person_id,
  t.created_at::date,
  CASE
    WHEN t.sector IS NOT NULL OR t.next_step IS NOT NULL OR t.notes IS NOT NULL
    THEN concat_ws(E'\n',
      CASE WHEN t.sector    IS NOT NULL THEN 'Sector: '       || t.sector    END,
      CASE WHEN t.next_step IS NOT NULL THEN 'Próximo paso: ' || t.next_step END,
      CASE WHEN t.notes     IS NOT NULL THEN t.notes END,
      '(Migrado desde cuentas objetivo)'
    )
    ELSE '(Migrado desde cuentas objetivo)'
  END,
  now(), now()
FROM public.target_accounts t
WHERE upper(t.name) IN ('BAMBU PRODUCCIONES','SECUOYA')
  AND NOT EXISTS (
    SELECT 1 FROM public.opportunities o
    WHERE o.kind = 'fichaje_productora'
      AND upper(o.title) = upper(t.name)
  );

-- 6. Vista ic_team
CREATE OR REPLACE VIEW public.ic_team AS
SELECT
  p.id, p.full_name, p.email, p.phone, p.notes,
  p.role, p.composer_id, p.created_at, p.updated_at
FROM public.people p
WHERE p.role = 'ic_team'::public.person_role;

GRANT SELECT ON public.ic_team TO authenticated;

COMMENT ON VIEW public.ic_team IS
  'Mundo A — Equipo IC. Vista sobre people filtrada a role=ic_team. El front debe migrar consultas de /people a esta vista.';

-- 7. Vista productions_roster_view (columnas seguras)
CREATE OR REPLACE VIEW public.productions_roster_view AS
SELECT
  pr.id, pr.title, pr.kind, pr.status,
  pr.delivery_date, pr.premiere_date, pr.fee_amount,
  pr.composer_id, pr.created_at, pr.updated_at
FROM public.productions pr;

GRANT SELECT ON public.productions_roster_view TO authenticated;

COMMENT ON VIEW public.productions_roster_view IS
  'Vista de producciones con columnas seguras para el rol composer. NO expone partner_company_id, notas de negociación, agente, ni datos económicos sensibles más allá de fee_amount. RLS hereda de productions.';
