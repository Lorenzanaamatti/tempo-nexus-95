ALTER TABLE public.candidacies
  ADD COLUMN IF NOT EXISTS response_status text NOT NULL DEFAULT 'sin_responder'
    CHECK (response_status IN ('sin_responder','respondida_si','respondida_no','en_espera')),
  ADD COLUMN IF NOT EXISTS response_at timestamptz;