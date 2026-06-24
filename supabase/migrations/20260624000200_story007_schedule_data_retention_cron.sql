-- STORY-007: schedule enforce-data-retention, following the same pg_cron + pg_net pattern
-- already used (but never versioned) for fetch-economic-indexes-daily and
-- send-obligation-alerts-daily — see those two jobs in cron.job for reference.
-- Weekly (not daily): this job only flags orgs inactive for 24+ months for review, so daily
-- runs would just create duplicate audit_logs entries for the same orgs with no added value.
SELECT cron.schedule(
  'enforce-data-retention-weekly',
  '0 8 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://igolxkyahbavripvfeak.supabase.co/functions/v1/enforce-data-retention',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
