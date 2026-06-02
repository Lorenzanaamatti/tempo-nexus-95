
-- Tier and representation status enums
CREATE TYPE representation_tier AS ENUM ('A','B','C','desarrollo');
CREATE TYPE representation_status AS ENUM ('activo','pausa','en_negociacion','finalizado');

ALTER TABLE public.composers
  ADD COLUMN artistic_name text,
  ADD COLUMN legal_name text,
  ADD COLUMN tier representation_tier,
  ADD COLUMN representation_status representation_status NOT NULL DEFAULT 'activo',
  ADD COLUMN agent_person_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  ADD COLUMN representation_start_date date,
  ADD COLUMN renewal_date date,
  ADD COLUMN career_notes text,
  ADD COLUMN portal_url text;

-- Documents / materials
CREATE TABLE public.composer_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  composer_id uuid NOT NULL REFERENCES public.composers(id) ON DELETE CASCADE,
  title text NOT NULL,
  kind text,
  url text,
  storage_path text,
  notes text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.composer_documents TO authenticated;
GRANT ALL ON public.composer_documents TO service_role;

ALTER TABLE public.composer_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "composer_documents all"
  ON public.composer_documents
  FOR ALL TO authenticated
  USING (public.can_access_composer(composer_id))
  WITH CHECK (public.can_access_composer(composer_id));

-- Allow admin/owner editing of new fields: update composer_field_guard to permit
-- artistic_name/legal_name/tier/etc edits by owners as well.
-- (keep restriction on internal_notes, fee_range_id, slug, owner, tags, full_name)
-- No change required: only listed fields are restricted.
