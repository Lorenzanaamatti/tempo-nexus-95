ALTER TYPE public.roster_prospect_estado ADD VALUE IF NOT EXISTS 'sin_contacto' BEFORE 'contactado';
ALTER TYPE public.roster_prospect_estado ADD VALUE IF NOT EXISTS 'en_pausa';
ALTER TYPE public.roster_prospect_estado ADD VALUE IF NOT EXISTS 'en_negociacion' BEFORE 'oferta_enviada';
ALTER TABLE public.roster_prospects ADD COLUMN IF NOT EXISTS origen text;
ALTER TABLE public.roster_prospects ADD COLUMN IF NOT EXISTS composer_id uuid REFERENCES public.composers(id) ON DELETE SET NULL;
ALTER TABLE public.roster_prospects ADD COLUMN IF NOT EXISTS target_account_id uuid REFERENCES public.target_accounts(id) ON DELETE SET NULL;