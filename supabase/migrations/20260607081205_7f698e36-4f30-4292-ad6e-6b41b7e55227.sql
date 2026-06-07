
-- Enum de canal fijo
DO $$ BEGIN
  CREATE TYPE public.chat_channel_kind AS ENUM (
    'general','producciones','oportunidades','facturacion','actas','calendario','contratos'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Canales
CREATE TABLE IF NOT EXISTS public.chat_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  composer_id uuid NOT NULL,
  kind public.chat_channel_kind NOT NULL,
  label text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (composer_id, kind)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_channels TO authenticated;
GRANT ALL ON public.chat_channels TO service_role;

ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_channels read" ON public.chat_channels
  FOR SELECT TO authenticated
  USING (public.current_user_is_admin() OR public.can_access_composer(composer_id));

CREATE POLICY "chat_channels admin write" ON public.chat_channels
  FOR ALL TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

CREATE TRIGGER chat_channels_touch BEFORE UPDATE ON public.chat_channels
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Mensajes
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  composer_id uuid NOT NULL,
  author_user_id uuid NOT NULL,
  author_name text,
  author_role text,
  body text,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_channel ON public.chat_messages(channel_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_composer ON public.chat_messages(composer_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_messages read" ON public.chat_messages
  FOR SELECT TO authenticated
  USING (public.current_user_is_admin() OR public.can_access_composer(composer_id));

CREATE POLICY "chat_messages insert" ON public.chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    author_user_id = auth.uid()
    AND (public.current_user_is_admin() OR public.can_access_composer(composer_id))
  );

CREATE POLICY "chat_messages update own" ON public.chat_messages
  FOR UPDATE TO authenticated
  USING (author_user_id = auth.uid() OR public.current_user_is_admin())
  WITH CHECK (author_user_id = auth.uid() OR public.current_user_is_admin());

CREATE POLICY "chat_messages delete own" ON public.chat_messages
  FOR DELETE TO authenticated
  USING (author_user_id = auth.uid() OR public.current_user_is_admin());

CREATE TRIGGER chat_messages_touch BEFORE UPDATE ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_channels;

-- Crear los 7 canales por defecto
CREATE OR REPLACE FUNCTION public.ensure_composer_chat_channels(_composer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.chat_channels (composer_id, kind, label, position) VALUES
    (_composer_id, 'general',       'General',       0),
    (_composer_id, 'producciones',  'Producciones',  1),
    (_composer_id, 'oportunidades', 'Oportunidades', 2),
    (_composer_id, 'facturacion',   'Facturación',   3),
    (_composer_id, 'contratos',     'Contratos',     4),
    (_composer_id, 'actas',         'Actas de reuniones', 5),
    (_composer_id, 'calendario',    'Calendario',    6)
  ON CONFLICT (composer_id, kind) DO NOTHING;
END $$;

GRANT EXECUTE ON FUNCTION public.ensure_composer_chat_channels(uuid) TO authenticated;

-- Trigger: crea canales al dar de alta un compositor
CREATE OR REPLACE FUNCTION public.composers_seed_chat_channels()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.ensure_composer_chat_channels(NEW.id);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS composers_seed_chat_channels_trg ON public.composers;
CREATE TRIGGER composers_seed_chat_channels_trg
  AFTER INSERT ON public.composers
  FOR EACH ROW EXECUTE FUNCTION public.composers_seed_chat_channels();

-- Seed para compositores existentes
DO $$
DECLARE _c record;
BEGIN
  FOR _c IN SELECT id FROM public.composers LOOP
    PERFORM public.ensure_composer_chat_channels(_c.id);
  END LOOP;
END $$;
