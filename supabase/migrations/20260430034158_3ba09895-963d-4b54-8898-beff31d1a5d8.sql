DROP VIEW IF EXISTS public.dashboard_summary CASCADE;

CREATE VIEW public.dashboard_summary
WITH (security_invoker = on) AS
WITH latest_analysis AS (
  SELECT DISTINCT ON (a.contract_id)
    a.contract_id,
    a.risk_score,
    a.financial_total
  FROM public.contract_analyses a
  ORDER BY a.contract_id, a.created_at DESC
)
SELECT
  c.org_id,
  COUNT(*)::int AS total_contracts,
  COALESCE(ROUND(AVG(la.risk_score))::int, 0) AS avg_risk_score,
  COALESCE(SUM(la.financial_total), 0)::bigint AS total_exposure_cents,
  (
    SELECT COUNT(*)::int FROM public.contract_obligations o
    WHERE o.org_id = c.org_id AND o.status = 'pendente'
  ) AS pending_obligations,
  (
    SELECT COUNT(*)::int FROM public.contract_obligations o
    WHERE o.org_id = c.org_id
      AND o.status = 'pendente'
      AND o.due_date IS NOT NULL
      AND o.due_date <= (CURRENT_DATE + INTERVAL '7 days')
      AND o.due_date >= CURRENT_DATE
  ) AS urgent_obligations
FROM public.contracts c
LEFT JOIN latest_analysis la ON la.contract_id = c.id
GROUP BY c.org_id;

GRANT SELECT ON public.dashboard_summary TO authenticated, anon;

ALTER TABLE public.contracts REPLICA IDENTITY FULL;
ALTER TABLE public.contract_obligations REPLICA IDENTITY FULL;
ALTER TABLE public.contract_analyses REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'contracts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.contracts;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'contract_obligations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.contract_obligations;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'contract_analyses'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.contract_analyses;
  END IF;
END $$;