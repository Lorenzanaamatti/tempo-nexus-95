
ALTER TABLE public.target_accounts
  ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'productora',
  ADD COLUMN IF NOT EXISTS roster_kind text,
  ADD COLUMN IF NOT EXISTS other_label text;

ALTER TABLE public.target_accounts
  DROP CONSTRAINT IF EXISTS target_accounts_account_type_chk;
ALTER TABLE public.target_accounts
  ADD CONSTRAINT target_accounts_account_type_chk
  CHECK (account_type IN ('roster','productora','plataforma','otros'));

ALTER TABLE public.target_accounts
  DROP CONSTRAINT IF EXISTS target_accounts_roster_kind_chk;
ALTER TABLE public.target_accounts
  ADD CONSTRAINT target_accounts_roster_kind_chk
  CHECK (roster_kind IS NULL OR roster_kind IN ('composer','artista','productor_musical','otros'));

CREATE INDEX IF NOT EXISTS target_accounts_account_type_idx ON public.target_accounts (account_type);
