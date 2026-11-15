-- Modulo de Cupom de Desconto, Etapa B -- agenda os 2 jobs novos.
-- generate-pix-renewals: diario 08:00 America/Sao_Paulo = 11:00 UTC
-- (docs/PAGAMENTOS_SPEC.md secao 9). coupon-sync: diario 07:00 BRT = 10:00
-- UTC, antes do job de Pix. Mesmo padrao de net.http_post + x-cron-secret
-- ja usado em dunning-daily/close-canceled-hourly.

SELECT cron.schedule(
  'coupon-sync-daily',
  '0 10 * * *',
  $$
  SELECT net.http_post(
    url := 'https://igolxkyahbavripvfeak.supabase.co/functions/v1/coupon-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'generate-pix-renewals-daily',
  '0 11 * * *',
  $$
  SELECT net.http_post(
    url := 'https://igolxkyahbavripvfeak.supabase.co/functions/v1/generate-pix-renewals',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
