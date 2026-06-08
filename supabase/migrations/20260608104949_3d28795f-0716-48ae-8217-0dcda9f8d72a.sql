
CREATE TABLE public.chat_message_reads (
  user_id uuid NOT NULL,
  composer_id uuid NOT NULL REFERENCES public.composers(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, composer_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_message_reads TO authenticated;
GRANT ALL ON public.chat_message_reads TO service_role;

ALTER TABLE public.chat_message_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cmr own rows" ON public.chat_message_reads
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER touch_cmr_updated_at
  BEFORE UPDATE ON public.chat_message_reads
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
