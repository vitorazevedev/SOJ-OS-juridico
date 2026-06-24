ALTER TABLE public.contract_analyses ADD COLUMN IF NOT EXISTS risk_level TEXT CHECK (risk_level IN ('low','medium','high','critical'));
ALTER TABLE public.contract_analyses ADD COLUMN IF NOT EXISTS model_used TEXT DEFAULT 'claude-sonnet-4-6';
