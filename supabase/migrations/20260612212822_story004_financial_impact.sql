-- Economic indexes table (public reference data, no RLS needed)
CREATE TABLE IF NOT EXISTS public.economic_indexes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  value NUMERIC(10,4) NOT NULL,
  period TEXT,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT economic_indexes_name_key UNIQUE (name)
);

-- Seed with current reference values (will be updated by cron)
INSERT INTO public.economic_indexes (name, value, period) VALUES
  ('selic', 14.75, '2026-06'),
  ('ipca_12m', 4.83, '2026-05'),
  ('inpc_12m', 4.21, '2026-05'),
  ('igpm_12m', 6.10, '2026-05')
ON CONFLICT (name) DO NOTHING;

GRANT SELECT ON public.economic_indexes TO authenticated, anon;

-- Add financial_impact JSONB to contract_analyses
ALTER TABLE public.contract_analyses
  ADD COLUMN IF NOT EXISTS financial_impact JSONB;

-- Add contract_value_informed to contracts (for simulator)
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS contract_value_informed NUMERIC(15,2);
