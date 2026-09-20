ALTER TABLE public.phase_catalog
  ADD COLUMN IF NOT EXISTS color_key text NOT NULL DEFAULT 'aubergine'
  CHECK (color_key IN ('aubergine','rust','avocado','berry','coral','mustard','teal','forest','denim','plum','rose','graphite'));

UPDATE public.phase_catalog
SET color_key = CASE lower(name)
  WHEN 'negociación' THEN 'aubergine'
  WHEN 'contratación' THEN 'rust'
  WHEN 'spotting' THEN 'avocado'
  WHEN 'composición' THEN 'berry'
  WHEN 'entrega' THEN 'coral'
  WHEN 'aprobación maquetas' THEN 'mustard'
  WHEN 'orquestación' THEN 'teal'
  WHEN 'copista' THEN 'forest'
  WHEN 'grabación' THEN 'denim'
  WHEN 'mezcla de música' THEN 'plum'
  WHEN 'masterización' THEN 'rose'
  WHEN 'entrega finalizada de músicas' THEN 'graphite'
  WHEN 'mezcla del audiovisual' THEN 'aubergine'
  WHEN 'entrega créditos' THEN 'rust'
  WHEN 'entrega cue-sheet' THEN 'avocado'
  WHEN 'otras entregas' THEN 'berry'
  WHEN 'estreno' THEN 'coral'
  ELSE color_key
END;