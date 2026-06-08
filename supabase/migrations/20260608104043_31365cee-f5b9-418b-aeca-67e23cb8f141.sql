
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS author_person_id uuid REFERENCES public.people(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_chat_messages_author_person ON public.chat_messages(author_person_id);
