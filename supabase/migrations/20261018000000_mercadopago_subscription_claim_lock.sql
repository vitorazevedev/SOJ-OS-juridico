-- QA fix (Story 1.2, Achado 1): organization_mercadopago_subscriptions
-- usava um INSERT simples protegido só por unique(org_id) como lock -- se
-- a Edge Function create-mercadopago-subscription caisse entre reservar o
-- placeholder e terminar (timeout, falha de rede ao chamar o Mercado Pago,
-- restart de deploy), a linha ficava presa pra sempre e a organizacao
-- nunca mais conseguia tentar assinar. Mesma classe de bug do incidente
-- real da Matrix nesta sessao (lock sem staleness/reclaim).
--
-- Esta RPC faz um UPSERT atomico com reclaim condicional: so reclama a
-- linha se ela ainda for um placeholder (mp_subscription_id comecando com
-- 'pending_') E tiver passado de 5 minutos (mesmo STALE_LOCK_MS ja usado
-- em supabase/functions/analyze-contract/index.ts para o lock de analise)
-- -- NUNCA mexe numa linha que ja tenha uma assinatura real vinculada
-- (sem o prefixo 'pending_').
create or replace function public.claim_mercadopago_subscription_lock(
  p_org_id uuid,
  p_placeholder_id text
)
returns boolean
language sql
security definer
set search_path = public
as $$
  insert into public.organization_mercadopago_subscriptions (org_id, mp_subscription_id, created_at, updated_at)
  values (p_org_id, p_placeholder_id, now(), now())
  on conflict (org_id) do update
    set mp_subscription_id = excluded.mp_subscription_id,
        created_at = now(),
        updated_at = now()
    where organization_mercadopago_subscriptions.mp_subscription_id like 'pending\_%' escape '\'
      and organization_mercadopago_subscriptions.created_at < now() - interval '5 minutes'
  returning true;
$$;

comment on function public.claim_mercadopago_subscription_lock is
  'Reserva atomicamente o vinculo de assinatura MP de uma organizacao. Reclama um placeholder abandonado (pending_*, >5min) se houver, mas nunca mexe numa assinatura real ja vinculada. Retorna true se reservou, null se ja existe uma assinatura real ou um placeholder ainda nao-stale.';

-- Só service_role (Edge Function) chama isso -- não expor para authenticated.
revoke all on function public.claim_mercadopago_subscription_lock(uuid, text) from authenticated, anon;
