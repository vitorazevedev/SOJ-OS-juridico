-- Auditoria pre-lancamento: send-obligation-alerts, enforce-data-retention e
-- fetch-economic-indexes rodam com verify_jwt=false (obrigatorio, pg_cron
-- chama via net.http_post sem Authorization) mas o corpo delas nao checava
-- nenhum segredo -- qualquer um que descobrisse a URL podia disparar a
-- function. Nenhuma delas fazia algo destrutivo, mas send-obligation-alerts
-- envia e-mail real (Resend) e as tres fazem escrita/leitura com
-- service_role. Passa a exigir um header x-cron-secret validado contra uma
-- env var (CRON_SECRET, ja setada via `supabase secrets set`), guardado no
-- Vault e injetado nos proprios jobs de cron via subquery -- nao fica em
-- texto plano em nenhum arquivo versionado.

SELECT cron.schedule(
  'fetch-economic-indexes-daily',
  '0 11 * * 1-5',
  $$
  SELECT net.http_post(
    url := 'https://igolxkyahbavripvfeak.supabase.co/functions/v1/fetch-economic-indexes',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
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
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  )
  $$
);

SELECT cron.schedule(
  'enforce-data-retention-weekly',
  '0 8 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://igolxkyahbavripvfeak.supabase.co/functions/v1/enforce-data-retention',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
