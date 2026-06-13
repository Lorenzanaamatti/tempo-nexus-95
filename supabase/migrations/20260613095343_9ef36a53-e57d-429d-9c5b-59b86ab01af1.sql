
CREATE OR REPLACE FUNCTION public.ensure_production_chat_channel(_composer_id uuid, _production_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _channel_id uuid;
  _title text;
  _pos int;
BEGIN
  -- Authorization: admin OR owner of composer
  IF NOT (public.current_user_is_admin() OR public.can_access_composer(_composer_id)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  -- Production must belong to the composer
  SELECT COALESCE(p.title, 'Producción') INTO _title
  FROM public.productions p
  WHERE p.id = _production_id AND p.composer_id = _composer_id;
  IF _title IS NULL THEN
    RAISE EXCEPTION 'production not linked to composer';
  END IF;

  SELECT id INTO _channel_id
  FROM public.chat_channels
  WHERE composer_id = _composer_id AND production_id = _production_id;
  IF _channel_id IS NOT NULL THEN
    -- Keep label in sync with production title
    UPDATE public.chat_channels SET label = _title, updated_at = now()
    WHERE id = _channel_id AND label IS DISTINCT FROM _title;
    RETURN _channel_id;
  END IF;

  SELECT COALESCE(MAX(position), 0) + 1 INTO _pos
  FROM public.chat_channels WHERE composer_id = _composer_id;

  INSERT INTO public.chat_channels(composer_id, kind, label, position, production_id)
  VALUES (_composer_id, 'produccion', _title, _pos, _production_id)
  RETURNING id INTO _channel_id;

  RETURN _channel_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_production_chat_channel(uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.ensure_production_chat_channel(uuid, uuid) TO authenticated;
