-- Modulo de Pagamentos, Fase 5c -- agenda o job issue-invoices (spec
-- secao 9: "a cada 5 min"). Mesmo padrao dos outros jobs.

SELECT cron.schedule(
  'issue-invoices-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://igolxkyahbavripvfeak.supabase.co/functions/v1/issue-invoices',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
