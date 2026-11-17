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

## Pendência (2026-11-11): Pix avulso via `/v1/payments` recusado pelo Mercado Pago (`Unauthorized use of live credentials`)

Testado ao vivo contra a conta de teste real (Fase 6): o fluxo de **assinatura por cartão** funciona ponta a ponta (`createSubscription` via `/preapproval` → cobrança aprovada → webhook assinado processa certo → `subscriptions.status='active'`). O fluxo de **Pix avulso** (`createPixPayment`, que chama `/v1/payments` diretamente) é recusado pelo Mercado Pago com `401 {"error":"unauthorized","message":"Unauthorized use of live credentials","cause":[{"code":7}]}`, reproduzido também via `curl` direto contra a API (não é um bug do nosso código — confirmado isolando a chamada).

Causa provável (não 100% confirmada pela documentação oficial, mas consistente com o padrão observado): o Mercado Pago está restringindo/descontinuando a API legada de pagamento avulso (`/v1/payments`) em favor da "Orders API" nova, e aplicações de teste recentes (como a nossa) não têm mais a permissão de "Payments" habilitada por padrão nessa API legada — diferente do endpoint de assinaturas (`/preapproval`), que continuou funcionando porque usa o motor de cobrança recorrente interno do MP, não essa chamada direta.

**Decisão (Vitor, 2026-11-11):** pausar o teste do Pix por agora. O cartão (fluxo principal de receita) já está validado ponta a ponta. Retomar quando houver tempo pra decidir entre: (a) investigar no painel do MP se dá pra habilitar "Payments" nessa aplicação sem trocar de API, ou (b) migrar `MercadoPagoProvider.createPixPayment`/`getPayment` pra "Orders API" do Mercado Pago (mudança de API mais ampla, não um ajuste pontual).

## Resolvido (2026-11-11): webhook real do Mercado Pago nunca chegava — URL de produção configurada errada no painel

Depois de ativar uma assinatura real por cartão com sucesso, nenhum webhook de verdade do Mercado Pago chegava em `billing-webhook` (só os que a gente mesmo simulou com assinatura HMAC manual, pra validar o código). Causa raiz: o painel do MP (**Configurar notificações → Webhooks**) tem duas abas com URLs separadas, **"Modo de teste"** e **"Modo de produção"** — a aba de teste já tinha a URL certa (`https://igolxkyahbavripvfeak.supabase.co/functions/v1/billing-webhook`), mas a aba de produção estava **em branco** (placeholder `https://www.seudominio.com`). Como estamos usando as credenciais de produção da conta de teste (não existem credenciais `TEST-` pra uma conta de teste), os eventos reais de assinatura são classificados pelo MP como "Ambiente: Produtivo" — por isso caíam na aba errada/vazia e nunca saíam do lado do MP.

**Fix:** preencheu a URL de produção com o mesmo endereço da aba de teste (mesma "Assinatura secreta" nas duas abas, nada a mudar em `MP_WEBHOOK_SECRET`). Confirmado com o botão "Simular notificação" do próprio painel do MP: POST real chegou em `billing-webhook`, `webhook_events.signature_valid = true` — a camada de transporte e verificação de assinatura está correta de ponta a ponta. (O evento simulado falhou ao processar por buscar um `preapproval_id` fake que não existe de verdade no MP — comportamento esperado, não é um bug.)

**Lição pra qualquer configuração futura de webhook no painel do Mercado Pago:** sempre conferir as duas abas (teste e produção), mesmo quando só uma parece relevante — o MP pode rotear eventos reais de contas de teste pela aba "produção" dependendo do tipo de credencial usada.

## Correção (2026-11-14): o teste de 10-11/11 não usou a conta real da Ponderum — credenciais de produção da GVF nunca tinham sido ativadas

Ao revisar o checklist de go-live da Fase 6, descobrimos que a conta principal (**GVF Serviços de Tecnologia Ltda**, CNPJ da Ponderum) nunca tinha ativado suas "Credenciais de produção" de verdade — a tela de ativação (Developers → Credenciais de produção) pedia, pela primeira vez, Setor de atuação + Site + aceite de termos, o que só acontece quando a conta real nunca gerou esse par de chaves antes.

Isso confirma e detalha a nota da seção anterior ("não existem credenciais `TEST-` pra uma conta de teste"): o teste de assinatura por cartão de 10-11/11 rodou contra uma **conta de teste** (sub-usuário de teste do MP), cujas credenciais vêm no mesmo formato de produção (`APP_USR-...`) mas não são a conta bancária real da GVF. Ou seja, a cobrança de R$499 testada naquele dia não necessariamente envolveu dinheiro caindo na conta real da Ponderum — era dentro do sandbox do MP, só com formato de credencial de produção.

**Ação tomada (2026-11-14):**
1. Ativadas as credenciais de produção reais da aplicação "Ponderum" (Client ID `7679733491364531`) sob a conta GVF, com Setor = "Serviços de TI" e Site = `https://ponderum.com`.
2. `MP_ACCESS_TOKEN` (secret do Supabase) substituído pelo Access Token real gerado nessa ativação.
3. `VITE_MP_PUBLIC_KEY` adicionado nos Environment Variables da Vercel (projeto `ponderum`, só ambiente **Production**, tipo **Config** — não é segredo, vai pro bundle público do navegador de qualquer forma) com o Public Key real (`APP_USR-05ef75e1-...`). Antes desta mudança, **essa variável não existia na Vercel** — o site publicado (`app.ponderum.com`) nunca tinha conseguido tokenizar cartão de verdade, mesmo com o backend já configurado pra `PAYMENT_PROVIDER=mercadopago`.
4. Webhook de produção (aba "Modo de produção", mesmo painel da seção anterior) configurado com a URL `https://igolxkyahbavripvfeak.supabase.co/functions/v1/billing-webhook` e os eventos Planos e assinaturas / Pagamentos (legacy) / Contestações — estava vazio antes dessa ativação (consequência direta de nunca ter existido uma credencial de produção real até agora).
5. `MP_WEBHOOK_SECRET` (secret do Supabase) substituído pela assinatura secreta gerada na aba de produção dessa aplicação.
6. Redeploy do projeto `apps/client` na Vercel pra aplicar a `VITE_MP_PUBLIC_KEY` nova.

**Decisão (Vitor, 2026-11-14):** não fazer um teste de cobrança real agora pra validar ponta a ponta — confiar no mecanismo já testado antes (mesma lógica de código, só trocando as chaves) e validar organicamente quando o primeiro cliente real assinar. Se algo falhar, o alerta de webhook `failed` (adicionado nesta mesma sessão, ver commit `ba60388`) avisa por e-mail em `contato@ponderum.com`.

Com isso, o checklist de go-live da Fase 6 (`docs/PAGAMENTOS_SPEC.md`, linhas 603-611) fica assim:
- [x] Credenciais de produção reais nos secrets do Supabase; `PAYMENT_PROVIDER=mercadopago`
- [x] Public key de produção do MP só no ambiente Production da Vercel
- [x] Webhook de produção configurado (URL + eventos reais da conta GVF, não mais da conta de teste)
- [x] Simulador desligado em produção (guarda automática, `billing-dev-simulator` só roda com `provider.name==='mock'`)
- [x] Prazo de liberação do dinheiro conferido no painel do MP — "Na hora" pro canal Checkout/API (não D+30; o `MercadoPagoProvider` real já lê `money_release_date` direto da resposta da API, sem assumir nada fixo — só o `MockProvider` usa D+30 pra simulação)
- [x] Alertas de webhook `failed` / chargeback aberto (ambos por e-mail, `contato@ponderum.com`)
- [ ] Pix — permanece pausado (ver pendência 2026-11-11 acima), decisão de retomar fica pra depois
- [ ] Termos de Uso com cláusulas de pagamento/cancelamento/reembolso — o Fellipe está escrevendo separadamente, fora do escopo técnico desta etapa
- [ ] NFS-e real — depende do contador (decisão em aberto #6), segue em mock

## Correção (2026-11-16): limpeza dos dados de teste + MRR contando acesso interno como receita

Antes do primeiro push do módulo de pagamentos completo pro `main`, todos os dados de teste gerados nesta fase (pagamentos, assinaturas, chargeback, cliente de cobrança, logs de auditoria/rate-limit/webhook) foram removidos em produção — pertenciam todos a uma única organização de teste. Nenhum cliente real havia processado pagamento até então.

**Achado durante essa limpeza:** `get_admin_finance_summary()` contava no MRR qualquer `subscriptions.status='active'`, inclusive as de `provider='manual'` — usadas desde a Fase 1 pra dar acesso de staff (Fellipe, Gabriel/Kober, Vitor) sem cobrança real. Isso inflava o MRR em R$980,00 com zero pagamento de verdade. Corrigido (`20261116010000_billing_fix_mrr_excludes_manual_subscriptions.sql`): MRR só soma assinaturas com `provider <> 'manual'`.

**Decisão (Vitor, 2026-11-16):** as 3 contas internas (Fellipe, Kober, Vitor — esta última renomeada de "Organização do SOJ" pra "Vitor Azevedo", já que não é mais um ambiente de teste) passam a ter plano `corporativo` (o mais alto) via assinatura `provider='manual'`, dando acesso completo à plataforma sem contar como receita — mesmo padrão já usado, só formalizado e com o bug do MRR corrigido.
