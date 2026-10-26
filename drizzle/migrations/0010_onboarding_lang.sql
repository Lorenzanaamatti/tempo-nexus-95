ALTER TABLE public.onboarding_slides ADD COLUMN IF NOT EXISTS lang text NOT NULL DEFAULT 'ca';
CREATE INDEX IF NOT EXISTS onboarding_slides_lang_pos ON public.onboarding_slides(lang, position);