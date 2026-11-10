-- Modulo de Pagamentos, Fase 4a -- agenda o job close-canceled (spec
-- secao 9: "horario"). Mesmo padrao de 20260827000000_schedule_resume_stuck_analyses.sql
-- (pg_cron -> net.http_post -> x-cron-secret do vault).

SELECT cron.schedule(
  'close-canceled-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://igolxkyahbavripvfeak.supabase.co/functions/v1/close-canceled',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
