-- Vigia de análises travadas (Fase A concluída, Fase B nunca confirmou nem
-- um lote, ninguém processando agora) -- cobre o caso em que o cliente
-- nunca mais reabre a página. Caso real que motivou isso: cliente Matrix,
-- 2026-08-24, ficou travado 2 dias até intervenção manual (ver
-- SECURITY_DEBT.md / commit da retomada automática).
--
-- Roda a cada 15 minutos, processa só UM lote de UM contrato por execução
-- (mesmo teto de 150s da function) -- ver comentário no topo de
-- resume-stuck-analyses/index.ts.

SELECT cron.schedule(
  'resume-stuck-analyses-15min',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://igolxkyahbavripvfeak.supabase.co/functions/v1/resume-stuck-analyses',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
