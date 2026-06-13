CREATE TABLE public.agent_tools (
  agent_person_id uuid NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  tool_name text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (agent_person_id, tool_name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_tools TO authenticated;
GRANT ALL ON public.agent_tools TO service_role;
ALTER TABLE public.agent_tools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agent_tools admin all" ON public.agent_tools
  TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

CREATE TYPE public.agent_action_status AS ENUM ('pending', 'approved', 'rejected', 'failed');

CREATE TABLE public.agent_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_person_id uuid NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  tool_name text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary text,
  status public.agent_action_status NOT NULL DEFAULT 'pending',
  requested_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at timestamptz,
  decision_notes text,
  resulting_entity_kind text,
  resulting_entity_id uuid,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_agent_actions_status ON public.agent_actions(status, requested_at DESC);
CREATE INDEX idx_agent_actions_agent ON public.agent_actions(agent_person_id, requested_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_actions TO authenticated;
GRANT ALL ON public.agent_actions TO service_role;
ALTER TABLE public.agent_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agent_actions admin all" ON public.agent_actions
  TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());
CREATE TRIGGER trg_agent_actions_touch
  BEFORE UPDATE ON public.agent_actions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();