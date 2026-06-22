
-- 1. Enum área
DO $$ BEGIN
  CREATE TYPE public.action_area AS ENUM ('roster','oportunidades','economico','legal','marketing','general','produccion','comunicacion');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Columnas nuevas en actions
ALTER TABLE public.actions
  ADD COLUMN IF NOT EXISTS area public.action_area,
  ADD COLUMN IF NOT EXISTS subarea text,
  ADD COLUMN IF NOT EXISTS entry_date date NOT NULL DEFAULT current_date,
  ADD COLUMN IF NOT EXISTS requester_user_id uuid;

-- 3. Trigger para auto-poblar requester_user_id en INSERT
CREATE OR REPLACE FUNCTION public.actions_set_requester()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.requester_user_id IS NULL THEN
    NEW.requester_user_id := auth.uid();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS actions_set_requester_trg ON public.actions;
CREATE TRIGGER actions_set_requester_trg
  BEFORE INSERT ON public.actions
  FOR EACH ROW EXECUTE FUNCTION public.actions_set_requester();

-- 4. people.user_id para enlazar miembros IC sin composer
ALTER TABLE public.people
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_people_user_id ON public.people(user_id);
CREATE INDEX IF NOT EXISTS idx_actions_assignee_done ON public.actions(assignee_person_id, done);
CREATE INDEX IF NOT EXISTS idx_actions_requester ON public.actions(requester_user_id);
CREATE INDEX IF NOT EXISTS idx_actions_area ON public.actions(area);
