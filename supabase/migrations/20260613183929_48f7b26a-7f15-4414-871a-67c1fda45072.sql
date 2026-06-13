
-- Liberar las FKs hacia dm_contactos para poder usar entidades reales del CRM
ALTER TABLE public.deal_memos DROP CONSTRAINT IF EXISTS deal_memos_cliente_id_fkey;
ALTER TABLE public.deal_memos DROP CONSTRAINT IF EXISTS deal_memos_contraparte_id_fkey;
ALTER TABLE public.deal_memos DROP CONSTRAINT IF EXISTS deal_memos_validador_interno_id_fkey;
ALTER TABLE public.deal_memos DROP CONSTRAINT IF EXISTS deal_memos_validador_final_id_fkey;

-- Tipo de entidad para cliente / contraparte: composer (roster) o company (productora)
ALTER TABLE public.deal_memos
  ADD COLUMN IF NOT EXISTS cliente_kind text,
  ADD COLUMN IF NOT EXISTS contraparte_kind text;

ALTER TABLE public.deal_memos
  DROP CONSTRAINT IF EXISTS deal_memos_cliente_kind_chk,
  ADD CONSTRAINT deal_memos_cliente_kind_chk CHECK (cliente_kind IS NULL OR cliente_kind IN ('composer','company'));

ALTER TABLE public.deal_memos
  DROP CONSTRAINT IF EXISTS deal_memos_contraparte_kind_chk,
  ADD CONSTRAINT deal_memos_contraparte_kind_chk CHECK (contraparte_kind IS NULL OR contraparte_kind IN ('composer','company'));

-- Limpiar valores existentes que apuntaban a placeholders de dm_contactos
UPDATE public.deal_memos SET cliente_id = NULL, cliente_kind = NULL
  WHERE cliente_id IS NOT NULL
    AND cliente_id NOT IN (SELECT id FROM public.composers)
    AND cliente_id NOT IN (SELECT id FROM public.production_companies);
UPDATE public.deal_memos SET contraparte_id = NULL, contraparte_kind = NULL
  WHERE contraparte_id IS NOT NULL
    AND contraparte_id NOT IN (SELECT id FROM public.composers)
    AND contraparte_id NOT IN (SELECT id FROM public.production_companies);
UPDATE public.deal_memos SET validador_interno_id = NULL
  WHERE validador_interno_id IS NOT NULL AND validador_interno_id NOT IN (SELECT id FROM public.people);
UPDATE public.deal_memos SET validador_final_id = NULL
  WHERE validador_final_id IS NOT NULL AND validador_final_id NOT IN (SELECT id FROM public.people);
