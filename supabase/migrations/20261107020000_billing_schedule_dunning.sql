-- Modulo de Pagamentos, Fase 4b -- agenda o job dunning (spec secao 9:
-- "diario 09:00" America/Sao_Paulo = 12:00 UTC). Mesmo padrao de
-- 20260827000000_schedule_resume_stuck_analyses.sql.

SELECT cron.schedule(
  'dunning-daily',
  '0 12 * * *',
  $$
  SELECT net.http_post(
    url := 'https://igolxkyahbavripvfeak.supabase.co/functions/v1/dunning',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
