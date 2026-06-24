-- Bring the two pre-existing pg_cron jobs (set up directly via SQL Editor, never versioned)
-- under version control. cron.schedule() upserts by jobname, so re-running this against the
-- already-correct live state is a no-op — same auditability rationale as
-- 20260623000000_story007_version_existing_rls_policies.sql.

SELECT cron.schedule(
  'fetch-economic-indexes-daily',
  '0 11 * * 1-5',
  $$
  SELECT net.http_post(
    url := 'https://igolxkyahbavripvfeak.supabase.co/functions/v1/fetch-economic-indexes',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'send-obligation-alerts-daily',
  '0 10 * * 1-5',
  $$
  SELECT net.http_post(
    url := 'https://igolxkyahbavripvfeak.supabase.co/functions/v1/send-obligation-alerts',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  )
  $$
);
