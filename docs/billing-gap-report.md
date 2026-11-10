# Diagnóstico — Módulo de Pagamentos (Fase 0)

> Gerado em 2026-10-31, sem alterar nenhum código ou dado. Varredura completa do repositório (`.triviaiox-core/**` ignorado — framework interno, cita "Stripe/webhook" só como exemplo didático genérico, sem relação com o produto) e consulta direta ao banco de produção (`igolxkyahbavripvfeak`).

## Resumo executivo

O projeto **não começa do zero**, mas também não tem nada que siga a arquitetura desta spec ainda. O que existe hoje é um modelo mais simples — planos como coluna (`organizations.plan_id`/`plan_status`), ativação manual por um humano da equipe, e um primeiro passo isolado de integração direta com o Mercado Pago (Story 1.2, **pausada, não publicada**) que já tropeça no princípio mais importante da spec: **não chama o gateway atrás de uma interface, chama a API do Mercado Pago direto**.

**A decisão mais importante que preciso de você antes de qualquer linha de código (seção "Decisão necessária" abaixo):** adotar o modelo de dados completo da spec (`billing_plans`/`subscriptions`/`payments`) ou adaptar o modelo simples que já existe (`plan_id`/`organization_mercadopago_subscriptions`) e completá-lo com o que falta. Recomendo a segunda opção — é o que a própria spec permite ("mantenha os nomes existentes") e evita reescrever trabalho que já está testado em produção — mas é uma escolha sua, não minha.

---

## 0. Estado atual (tabela da spec, preenchida)

| Item | Situação | Onde está no código | Observações |
|---|---|---|---|
| Tabelas de planos/assinaturas/pagamentos | ☑ parcial | `organizations.plan_id`/`plan_status`/`plan_renews_at`; `organization_mercadopago_subscriptions` (migration `20261013000000_mercadopago_subscriptions_schema.sql`) | Sem tabela `billing_plans` configurável — planos vivem como constante no código (`src/lib/pricing.ts`, `supabase/functions/_shared/mercadopago-plans.ts`). Sem tabela `payments`. |
| Página de planos / preços | ☑ parcial | `src/components/settings/PlanTab.tsx`; seção `#planos` em `landing/index.html` (site estático separado) | Mostra os planos, mas o botão de upgrade abre WhatsApp — não é checkout de verdade. |
| Checkout (tela) | ☐ não iniciado | — | Não existe `CheckoutPage`, `CardBrick`, nem captura de dados de faturamento (CPF/CNPJ, endereço) em nenhum fluxo de pagamento. (`cnpj` já é coletado no cadastro da organização, mas para outro fim — ver seção 8.) |
| Integração com gateway (qualquer) | ☑ parcial | `supabase/functions/create-mercadopago-subscription/index.ts` | **Deployada em produção (v2, ACTIVE)** mas com código **não commitado no git** — risco real, ver "Conflitos" da Peça 1. Chama a API do Mercado Pago direto via `fetch`, sem interface `PaymentProvider`. |
| Webhook | ☐ não iniciado | `mercadopago_webhook_events` (só a tabela) | Zero Edge Function de webhook implementada. Nenhuma das 13 functions ativas em produção processa notificação do Mercado Pago. |
| Pix | ☐ não iniciado | — | Nenhuma menção a Pix/QR Code em nenhum lugar do código. |
| Assinatura recorrente | ☑ parcial | `organization_mercadopago_subscriptions` + `create-mercadopago-subscription` (cria a `preapproval`) + `claim_mercadopago_subscription_lock` (lock com reclaim por staleness) | Cria a assinatura no Mercado Pago, mas nada confirma a ativação (isso dependeria do webhook, que não existe). Sem máquina de estados (`incomplete/trialing/active/past_due/...`) — só o `plan_status` binário (`trial`/`active`) já existente. |
| Controle de acesso por plano (entitlements) | ☑ parcial | Checagem de cota em `parse-contract/index.ts` e `useContracts.ts` (`PLAN_MONTHLY_LIMIT`); view `contract_analyses_gated` (gating do índice de desequilíbrio por `plan_status`/`courtesy_unlock`) | Funciona, mas é lógica espalhada em vários lugares, não uma view única `organization_entitlements` como a spec propõe. |
| Cancelamento | ☐ não iniciado | — | Não existe fluxo de cancelamento self-service. Hoje a única forma de "desativar" um cliente é manual, via `staff_set_org_plan_status`. |
| Painel financeiro / admin | ☐ não iniciado | — | O Painel Dev mostra organizações/waitlist/custo de IA, mas não tem MRR, repasse, inadimplência nem chargebacks. |
| Nota fiscal | ☑ parcial (100% manual) | tabela `invoices`, RPC `staff_create_invoice`, Edge Function `admin-send-invoice-email` (usa Resend) | Fluxo manual funcional: um humano da equipe sobe o PDF da nota e dispara e-mail. Nenhuma automação/fila/provedor de NFS-e. |
| E-mails transacionais | ☑ parcial (infra pronta, sem templates de billing) | `RESEND_API_KEY` já configurado em produção; usado por `send-obligation-alerts` e `admin-send-invoice-email` | Resend já é o provedor do projeto — reaproveitar, não escolher outro (resolve a decisão em aberto #8 da spec). Nenhum dos templates de billing da seção 8 da spec existe ainda. |

**Decisões já tomadas que este documento deve respeitar:**
- Gateway: **Mercado Pago**, decidido pelos sócios (não é mais uma decisão em aberto — a seção 13.pergunta implícita sobre qual gateway já está resolvida).
- `plan_id`/`plan_status` como convenção (não `status` de assinatura único) — `plan_status` ∈ `{trial, active}` é o Freemium/pago; `plan_id` é o tier (`starter` legado, `individual`, `escritorio`, `juridico`, `corporativo`).
- 4 tiers pagos com preço fixo já definidos pelos sócios (Individual R$199, Escritório R$499, Jurídico R$899, Corporativo R$1.749) — ver `docs/prd-mercadopago-checkout.md`.
- `billing_receipts` (não `payments`) é o ledger que a equipe já usa — nome existente, mantido.
- Provedor de e-mail: **Resend** (já em produção, não é mais decisão em aberto).
- CNPJ/CPF já coletado no cadastro (`organizations.cnpj`), reaproveitável para NFS-e.

---

## Achado fora do escopo pedido, mas relevante

`organizations` tem uma coluna **`stripe_customer_id`** (texto, nullable) que não existe em nenhuma migration rastreada no repositório (foi adicionada direto no banco em algum momento, fora do controle de versão) e não é referenciada em **nenhum** código do projeto hoje (app, Edge Functions). É um vestígio morto, provavelmente de uma tentativa de integração com Stripe anterior a este projeto ou a este histórico de migrations. Não decidi nada sobre ela — só registro que existe, pra você decidir se quer documentar/remover numa migration futura (não mexi, conforme a regra da Fase 0).

---

## Diagnóstico por peça

### Peça 0 — Nunca guardar cartão
**Existe:** nada ainda (correto, pois nenhum checkout de cartão foi construído).
**Conforme a spec?** N/A — não há violação porque não há coleta de cartão nenhuma.
**Lacunas:** tudo — Card Brick, componente `CardBrick` mock, cartões de teste.
**Conflitos:** nenhum.
**Ação proposta:** construir do zero na Fase 3, como a spec descreve.

### Peça 1 — Gateway atrás de interface
**Existe:** `create-mercadopago-subscription/index.ts` chama `fetch('https://api.mercadopago.com/preapproval', ...)` diretamente dentro da Edge Function.
**Conforme a spec?** **Não.** Viola diretamente o Princípio 5 ("Regras de negócio chamam `PaymentProvider`, nunca o SDK/API direto").
**Lacunas:** não existe `provider.ts`, `MockProvider`, nem factory lendo `PAYMENT_PROVIDER`.
**Conflitos:** este é o conflito mais importante do diagnóstico inteiro. A Edge Function hoje:
1. Lê `MERCADOPAGO_ACCESS_TOKEN` direto do ambiente dentro da lógica de negócio (deveria estar encapsulado no `MercadoPagoProvider`).
2. Monta o payload do `/preapproval` direto no handler HTTP.
3. Não tem `MockProvider` nenhum — não dá pra testar o fluxo de assinatura sem a conta do Mercado Pago aprovada (que é exatamente a situação atual: **a conta ainda não existe, e esta function não pode ser testada de ponta a ponta por isso**, só os trechos que não dependem da chamada real, documentado honestamente na própria story 1.2).
**Ação proposta:** **substituir** (não adaptar) — extrair a chamada ao Mercado Pago para `providers/mercadopago.ts`, criar `providers/mock.ts`, e fazer a Edge Function chamar só a interface. Esforço: médio (a lógica de negócio em si — autorização, lock, validação de plano — já está certa e pode ficar; só a chamada HTTP precisa ser isolada atrás da interface).

### Peça 2 — Webhook
**Existe:** só a tabela `mercadopago_webhook_events` (ledger de idempotência vazio, nunca escrito).
**Conforme a spec?** Não aplicável — 0% implementado.
**Lacunas:** tudo — Edge Function `billing-webhook`, validação de assinatura `x-signature`, processador assíncrono, roteamento por tópico.
**Conflitos:** nenhum código viola nada porque nada foi escrito. Mas é a **lacuna mais crítica** do projeto: sem webhook, a assinatura criada por `create-mercadopago-subscription` nunca é confirmada como ativa de verdade — hoje não existe NENHUM caminho automático de "cliente pagou → acesso liberado".
**Ação proposta:** construir do zero, prioridade máxima (é a peça que destrava a maior parte das outras).

### Peça 3 — Idempotência
**Existe:** `claim_mercadopago_subscription_lock` (RPC com UPSERT condicional e reclaim por staleness, criada durante a correção de QA da Story 1.2) — é uma peça de engenharia genuinamente boa, já testada em produção.
**Conforme a spec?** **Parcial, mas no caminho certo.** Cobre bem a "Saída" (criação de assinatura não duplica) mas falta a camada de "Entrada" (idempotência de webhook, que nem existe ainda).
**Lacunas:** sem webhook, não tem como testar idempotência de evento repetido ainda. Sem `X-Idempotency-Key` sendo enviado nas chamadas ao Mercado Pago (a função atual não usa esse header).
**Conflitos:** nenhum — o padrão de lock atômico com staleness já usado aqui é o mesmo já comprovado em produção em outras partes do projeto (`analyze-contract`), reaproveitável.
**Ação proposta:** manter o lock existente, adicionar `X-Idempotency-Key` nas chamadas de saída quando o `MercadoPagoProvider` for construído.

### Peça 4 — Pix
**Existe:** nada.
**Conforme a spec?** N/A.
**Ação proposta:** construir do zero na Fase 3.

### Peça 5 — Assinatura recorrente
**Existe:** criação da `preapproval` (sem confirmação via webhook), tiers fixos com preço/limite centralizados em dois arquivos espelhados (`src/lib/pricing.ts` + `supabase/functions/_shared/mercadopago-plans.ts`), checagem de cota mensal (`PLAN_MONTHLY_LIMIT`).
**Conforme a spec?** Parcial — a *intenção* (centralizar preço, não hardcodar em vários lugares) já segue o espírito da spec, mas a *máquina de estados* da spec (`incomplete/trialing/active/past_due/paused/canceled/expired`) não existe — hoje só tem `plan_status` binário (`trial`/`active`).
**Lacunas:** `billing_day`, `current_period_start/end`, `cancel_at_period_end`, `past_due_since`, `grace_period_ends_at` não existem em lugar nenhum. Sem trial configurável (existe `trial_ends_at` na tabela `organizations`, mas não vi uso ativo dela no fluxo atual — vale confirmar com você se ainda é usada).
**Conflitos:** nenhum acesso pago hoje depende de `current_period_end`; depende só de `plan_status='active'`, que é setado manualmente ou (quando o webhook existir) pelo evento do Mercado Pago.
**Ação proposta:** **decisão necessária** (ver seção dedicada abaixo) antes de expandir isso.

### Peça 6 — Recuperação de cobrança (dunning)
**Existe:** um banner em `AppLayout.tsx` ("Sua assinatura Starter venceu"/"vence em N dias") com botão "Renovar agora" → `/settings?tab=plan`.
**Conforme a spec?** Parcial, mas baseado no modelo antigo (ciclo fixo de 30 dias renovado manualmente, não dunning de verdade — não existe o estado `past_due` nem carência).
**Lacunas:** tudo o que a spec pede: estado `past_due`, e-mails D0/D+3/D+6, tela de atualizar cartão, auto-pausa após carência.
**Conflitos:** nenhum.
**Ação proposta:** construir na Fase 4, decidindo se o banner existente evolui pro novo modelo ou é substituído.

### Peça 7 — Cancelamento
**Existe:** nada self-service. Só desativação manual via `staff_set_org_plan_status` (equipe interna).
**Conforme a spec?** Não implementado.
**Ação proposta:** construir do zero na Fase 4.

### Peça 8 — Chargeback e antifraude
**Existe:** nada.
**Conforme a spec?** Não implementado.
**Ação proposta:** Fase 5.

### Peça 9 — Repasse
**Existe:** nada (nenhum campo de taxa/valor líquido/data de liberação em nenhuma tabela).
**Conforme a spec?** Não implementado.
**Ação proposta:** Fase 5 — útil ter em mente desde já que `payments`/`fee_cents`/`net_cents`/`money_release_date` precisarão existir quando a Peça 5 for completada de verdade (hoje não há tabela `payments` nenhuma).

### Peça 10 — Nota fiscal
**Existe:** fluxo manual completo e funcional — `invoices` (tabela), `staff_create_invoice` (RPC), `admin-send-invoice-email` (Edge Function, envia o PDF por e-mail via Resend). `organizations.cnpj` já coletado no cadastro.
**Conforme a spec?** Parcial — resolve o problema hoje, mas é 100% manual (um humano sobe o PDF), não uma fila automática com `InvoiceProvider`.
**Lacunas:** nenhuma automação de emissão; nenhum `InvoiceProvider`/`MockInvoiceProvider`; provedor de NFS-e ainda não escolhido (decisão em aberto #6 da spec, segue em aberto).
**Conflitos:** nenhum — o fluxo manual pode conviver como *fallback* mesmo depois de automatizado (a própria Story 1.1/1.2 desta sessão já previu isso: "nunca bloquear o acesso do cliente por erro de nota").
**Ação proposta:** manter o fluxo manual como fallback, construir a automação na Fase 5.

---

## Decisão necessária antes da Fase 1

A spec propõe um modelo de dados rico (`billing_plans`, `subscriptions` com máquina de estados completa, `payments`, `billing_customers`). O que existe hoje é mais simples (`plan_id`/`plan_status` como coluna, `organization_mercadopago_subscriptions` só com o vínculo, sem estado próprio). Duas opções:

**Opção A — Adotar o modelo completo da spec.** Cria `billing_plans`/`subscriptions`/`payments` do zero, migra `organizations.plan_id`/`plan_status` pra dentro da nova `subscriptions`, e todo o gating de acesso passa a ler a `organization_entitlements` view nova. Mais fiel à spec, mais retrabalho (precisa migrar dado real de produção — já existem organizações pagantes).

**Opção B — Adaptar o que existe (recomendo esta).** Trata `organizations.plan_id`/`plan_status` como a "spec.subscriptions" simplificada (a própria spec permite isso: "mantenha os nomes existentes... a spec descreve comportamento, não obriga a renomear") e **completa** o que falta por cima: adiciona as colunas de estado que faltam (`current_period_end`, `past_due_since`, `grace_period_ends_at`, etc.) direto em `organizations` ou numa tabela `subscriptions` nova que referencia `organizations` 1:1, sem reescrever o que já funciona (gating, cota mensal, recibos). Cria `payments` do zero (não existe hoje, nenhuma opção escapa disso). Menos fiel à letra da spec, mas zero risco de regressão no que já está em produção.

Registrarei a escolha em `docs/billing-decisions.md` assim que você decidir — por enquanto deixei esse arquivo com um rascunho das correspondências de nomes já conhecidas, pendente da sua confirmação.

---

## Ordem de fases ajustada (proposta)

| Fase da spec | Status real | Recomendação |
|---|---|---|
| Fase 0 — Diagnóstico | ✅ este documento | — |
| Fase 1 — Fundação | 🟡 parcial | **Não pular.** Decidir Opção A/B acima primeiro; depois criar `providers/mercadopago.ts` + `providers/mock.ts` (extrair da `create-mercadopago-subscription` atual, que hoje viola o Princípio 5) e a tabela `payments` (não existe). Reaproveitar `organization_mercadopago_subscriptions`/`claim_mercadopago_subscription_lock` como estão. |
| Fase 2 — Webhook | 🔴 0% | **Prioridade máxima**, sem mudança na ordem — é a lacuna mais crítica, destrava a Peça 5 de verdade (confirmação de pagamento). |
| Fase 3 — Checkout | 🟡 parcial (só a metade "criar assinatura" do servidor existe) | Pode começar em paralelo ao webhook assim que a Fase 1 estiver pronta, mas **não liberar acesso de verdade sem o webhook** (mesmo em mock, seguir a regra "webhook é a única fonte da verdade" — o simulador de dev dispara o evento mock, não a tela). Reaproveitar os preços já centralizados em `pricing.ts`/`mercadopago-plans.ts`. Trocar os 3 pontos de upgrade manual via WhatsApp (`PlanTab.tsx`, `PlanFeatureLock.tsx`, landing `#planos`) pelo checkout novo nesta fase. |
| Fase 4 — Ciclo de vida | 🟡 parcial (banner de vencimento existe, mas modelo antigo) | Sem mudança de ordem. |
| Fase 5 — Risco/dinheiro/fiscal | 🟡 parcial só na Peça 10 (fluxo manual de nota já funciona) | Pode adiar a automação de NFS-e com segurança (fallback manual já existe e funciona) — não é bloqueador pra lançar o checkout. Repasse/chargeback seguem como a spec propõe. |
| Fase 6 — Ligar Mercado Pago real | 🔴 bloqueada (conta em aprovação) | Sem mudança — depende de fator externo. `MERCADOPAGO_ACCESS_TOKEN` confirmado **ausente** nos secrets de produção hoje. |

**Resumo em uma frase:** nada precisa ser jogado fora, mas a peça mais arriscada que já existe (a Edge Function que fala direto com o Mercado Pago) precisa ser refatorada para entrar atrás da interface antes de crescer mais, e a peça que mais falta (webhook) é o próximo passo de maior valor.
