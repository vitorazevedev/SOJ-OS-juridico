# Decisões de nomenclatura e escopo — Módulo de Pagamentos

> Mapeamento entre a nomenclatura de `docs/PAGAMENTOS_SPEC.md` e o que já existe no projeto, conforme a regra da própria spec ("mantenha os nomes existentes... a spec descreve comportamento, não obriga a renomear"). Gerado na Fase 0 (diagnóstico), 2026-10-31.

## Decisão confirmada (2026-10-31): Opção A — modelo de dados completo da spec

O Vitor decidiu adotar o modelo de dados completo da spec (`billing_plans`, `subscriptions` com máquina de estados completa, `payments`, `billing_customers`), não a versão simplificada adaptada do que já existe. Implicações práticas:

- `organizations.plan_id`/`plan_status`/`plan_renews_at`/`trial_ends_at` deixam de ser a fonte da verdade — a fonte da verdade passa a ser a nova tabela `subscriptions`. Precisa de uma migration de dados que leia o estado atual de cada organização e crie a linha correspondente em `subscriptions` (nenhuma organização pode ficar sem assinatura equivalente — há organizações reais em produção hoje, trial e active).
- Todo código que hoje lê `organizations.plan_id`/`plan_status` diretamente (gating em `parse-contract`, `analyze-contract`, `contract_analyses_gated`, `useContracts.ts`, várias telas do admin — ver lista de ~22 arquivos no relatório do diagnóstico) precisa ser migrado para ler da nova `subscriptions`/`organization_entitlements`, **sem quebrar o acesso de ninguém durante a transição**.
- `organization_mercadopago_subscriptions` (criada na Story 1.1) e `claim_mercadopago_subscription_lock` (Story 1.2) são absorvidas pela nova `subscriptions` (campos `provider`, `provider_subscription_id` já cobrem o que aquela tabela fazia) — não ficam como tabela separada.
- `billing_receipts`/`invoices` (ledgers manuais existentes) continuam existindo como estão — não fazem parte da substituição, a spec não pede isso.
- `create-mercadopago-subscription/index.ts` precisa ser refatorada para trabalhar com a nova `subscriptions`, não mais só com `organization_mercadopago_subscriptions`, além de ser movida para trás da interface `PaymentProvider` (já era necessário de qualquer forma, independente da escolha A/B).

Dado o risco real de migrar dado de produção, a implementação da Fase 1 vai seguir um plano detalhado (ver próxima seção do processo de trabalho) antes de qualquer migration ser aplicada.

## Mapeamento de nomes (spec → projeto real)

| Nome na spec | Nome real no projeto | Status |
|---|---|---|
| `billing_plans` (tabela) | `organizations.plan_id` (coluna) + `src/lib/pricing.ts`/`supabase/functions/_shared/mercadopago-plans.ts` (constantes) | Não é uma tabela configurável — planos fixos no código. Decisão pendente: criar `billing_plans` de verdade ou manter como constante (ver gap report). |
| `subscriptions` (tabela, com máquina de estados completa) | `organizations.plan_id`/`plan_status`/`plan_renews_at` + `organization_mercadopago_subscriptions` (vínculo com o Mercado Pago) | Parcial — falta `current_period_start/end`, `past_due_since`, `grace_period_ends_at`, `cancel_at_period_end`. |
| `payments` (tabela) | — não existe | A criar do zero, independente da decisão A/B do gap report. |
| `billing_customers` (tabela) | — não existe (dado de faturamento não é coletado em lugar nenhum hoje) | `organizations.cnpj` existe mas é coletado no cadastro, não no checkout. |
| `webhook_events` (tabela) | `mercadopago_webhook_events` | Nome diferente mas função equivalente — manter o nome existente. Faltam colunas `signature_valid`, `status`, `attempts`, `last_error`, `processed_at`. |
| `fiscal_invoices` (tabela) | `invoices` | Nome diferente, função equivalente mas 100% manual hoje (sem `provider`/`status`/fila). |
| `billing_receipts` (ledger de recibo) | `billing_receipts` | **Nome igual**, já existe, já em uso pelo fluxo manual (`staff_set_org_plan_status`/`staff_renew_org_subscription`). |
| `chargebacks`, `checkout_attempts`, `billing_audit_log` (tabelas) | — não existem | A criar do zero quando chegar a Fase 5 (ou antes, se quiser auditoria desde já). |
| `organization_entitlements` (view) | — não existe como view única; lógica espalhada em `parse-contract/index.ts`, `useContracts.ts` (`PLAN_MONTHLY_LIMIT`) e na view `contract_analyses_gated` | Candidato a unificação futura, não bloqueador. |
| `PaymentProvider` (interface) | — não existe | `create-mercadopago-subscription/index.ts` chama a API do Mercado Pago direto, violando o Princípio 5 da spec. Extrair é a ação mais importante da Fase 1. |
| `MockProvider` | — não existe | Idem acima. |

## Decisões em aberto da spec (seção 13) — status

| # | Decisão | Status |
|---|---|---|
| 1 | Planos, preços, limites | **Resolvido** — 4 tiers pagos definidos pelos sócios (Individual R$199, Escritório R$499, Jurídico R$899, Corporativo R$1.749), ver `docs/prd-mercadopago-checkout.md`. |
| 2 | Trial (dias, pede cartão?) | Em aberto. Existe `organizations.trial_ends_at` (default 7 dias), é buscada pelo `useOrganization.ts`, mas **não é lida em nenhum lugar depois disso** (confirmado via busca no código) — campo morto hoje, assim como o acesso Freemium atual não tem prazo de expiração de verdade. Perguntar ao Vitor se o conceito de trial com prazo ainda é desejado. |
| 3 | Plano anual | Em aberto, não mencionado em nenhuma decisão até aqui. |
| 4 | Carência do dunning | Em aberto — spec sugere 7 dias como padrão, nada decidido ainda pro Ponderum. |
| 5 | Reembolso CNPJ / proporcional | Em aberto. |
| 6 | Provedor de NFS-e | Em aberto (depende do contador: provedor, código de serviço LC 116, alíquota ISS, regime tributário da GVF). A Fase 5c (2026-11-07) implementou a fila `fiscal_invoices` + interface `InvoiceProvider` atrás de um `MockInvoiceProvider` — nenhum dado fiscal real é usado, notas emitidas em mock são claramente rotuladas "SIMULAÇÃO — SEM VALOR FISCAL" e nunca se passam por documento fiscal de verdade. Quando o provedor for escolhido, só implementa `InvoiceProviders/<provedor>.ts` atrás da mesma interface, igual o plano para `MercadoPagoProvider` (Fase 6). |
| 7 | Exigir CNPJ ou aceitar CPF | Parcialmente respondido pelo uso real: a Ponderum já atende profissionais autônomos (campo "Como você atua hoje" no formulário de waitlist inclui "Advogado(a) autônomo(a)"), sugerindo que CPF precisa ser aceito, não só CNPJ. Confirmar oficialmente com o Vitor. |
| 8 | Provedor de e-mail transacional | **Resolvido** — Resend, já em produção (`RESEND_API_KEY` configurado, usado por `send-obligation-alerts` e `admin-send-invoice-email`). |

## Achado fora do mapeamento: `organizations.stripe_customer_id`

Coluna existente no banco de produção, sem migration correspondente no repositório e sem nenhuma referência em código (app ou Edge Functions). Não mapeia pra nada na spec atual (gateway decidido é Mercado Pago, não Stripe). Registrado aqui só para rastreabilidade — nenhuma ação tomada.
