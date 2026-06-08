ALTER TABLE public.deal_memos ADD COLUMN IF NOT EXISTS opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE SET NULL;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS deal_memo_id uuid REFERENCES public.deal_memos(id) ON DELETE SET NULL;
ALTER TABLE public.productions ADD COLUMN IF NOT EXISTS contract_id uuid REFERENCES public.contracts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_deal_memos_opportunity_id ON public.deal_memos(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_contracts_deal_memo_id ON public.contracts(deal_memo_id);
CREATE INDEX IF NOT EXISTS idx_productions_contract_id ON public.productions(contract_id);