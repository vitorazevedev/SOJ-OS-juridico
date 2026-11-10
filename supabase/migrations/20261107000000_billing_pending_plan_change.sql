-- Modulo de Pagamentos -- troca de plano (upgrade/downgrade) pra quem ja e
-- assinante (spec Peca 5, "v1 simples"). Downgrade so vale no proximo
-- ciclo: guarda a intencao aqui, aplicada por advanceSubscriptionPeriod()
-- (_shared/billing/domain/webhooks.ts) na proxima renovacao aprovada --
-- reusa o mecanismo de "proximo ciclo" que ja existe, sem cron novo.

alter table public.subscriptions
  add column pending_plan_id uuid references public.billing_plans(id);
