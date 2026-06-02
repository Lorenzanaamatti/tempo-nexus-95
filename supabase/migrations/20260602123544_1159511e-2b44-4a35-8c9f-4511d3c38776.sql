ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS detected_date date,
  ADD COLUMN IF NOT EXISTS expected_close_date date,
  ADD COLUMN IF NOT EXISTS last_contact_date date;