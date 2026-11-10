# Ponderum — Especificação do Módulo de Pagamentos e Assinaturas

> **Para os agentes:** este documento é a fonte da verdade do módulo de pagamentos. Leia-o inteiro antes de escrever código. Trabalhe na ordem das **Fases (seção 12)**. Toda a integração com o gateway fica atrás de uma interface (`PaymentProvider`). **Hoje implementamos tudo com um `MockProvider`.** Quando a conta do Mercado Pago for aprovada, só implementamos o `MercadoPagoProvider` e trocamos uma variável de ambiente. Nenhuma regra de negócio pode depender diretamente do SDK do Mercado Pago.

> ⚠️ **Este projeto NÃO começa do zero.** Parte do fluxo de pagamento já foi iniciada antes deste documento existir. Antes de qualquer implementação, execute a **Fase 0 (Diagnóstico)** da seção 12 e leia a seção **0. Estado atual**. Regra geral: **adaptar e completar o que existe, não reescrever.** Só substitua código existente quando ele violar um dos *Princípios inegociáveis* (seção 2). Nesse caso, explique o motivo no relatório antes de mudar.

## 0. Estado atual (preenchido pelo Vitor, confirmado pelo diagnóstico)

| Item | Situação | Onde está no código | Observações |
|---|---|---|---|
| Tabelas de planos/assinaturas/pagamentos | ☐ não iniciado ☐ parcial ☐ pronto | | |
| Página de planos / preços | ☐ não iniciado ☐ parcial ☐ pronto | | |
| Checkout (tela) | ☐ não iniciado ☐ parcial ☐ pronto | | |
| Integração com gateway (qualquer) | ☐ não iniciado ☐ parcial ☐ pronto | | |
| Webhook | ☐ não iniciado ☐ parcial ☐ pronto | | |
| Pix | ☐ não iniciado ☐ parcial ☐ pronto | | |
| Assinatura recorrente | ☐ não iniciado ☐ parcial ☐ pronto | | |
| Controle de acesso por plano (entitlements) | ☐ não iniciado ☐ parcial ☐ pronto | | |
| Cancelamento | ☐ não iniciado ☐ parcial ☐ pronto | | |
| Painel financeiro / admin | ☐ não iniciado ☐ parcial ☐ pronto | | |
| Nota fiscal | ☐ não iniciado ☐ parcial ☐ pronto | | |
| E-mails transacionais | ☐ não iniciado ☐ parcial ☐ pronto | | |

**Decisões já tomadas que este documento deve respeitar** (nomes de tabelas, bibliotecas, fluxos já aprovados):
- _(preencher)_

Se o código existente usar **nomes diferentes** dos desta spec (tabelas, colunas, pastas), **mantenha os nomes existentes** e registre o mapeamento em `docs/billing-decisions.md` (ex.: `spec.subscriptions` → `public.assinaturas`). A spec descreve *comportamento*, não obriga a renomear.

**Stack:** React + TypeScript (front hospedado na **Vercel**) · Supabase (Postgres, Auth, Edge Functions em Deno, pg_cron) · Mercado Pago (Checkout Bricks + API de Pagamentos + API de Assinaturas/`preapproval`).

**Onde roda cada coisa:**
- **Vercel:** só o front (app React). Nenhum segredo de pagamento fica na Vercel; ela recebe apenas variáveis públicas (`PUBLIC_KEY` do MP, URL/anon key do Supabase).
- **Supabase Edge Functions:** toda a lógica de cobrança, o webhook e os jobs. O webhook **não** fica em `/api` da Vercel. Motivo: fica ao lado do banco, usa a service role sem expô-la à Vercel e a URL do webhook não muda a cada deploy.
- **Ambientes Vercel:** *Preview* e *Development* sempre apontam para o Supabase de staging com `PAYMENT_PROVIDER=mock`. Só *Production* aponta para o Supabase de produção. Configure as variáveis por ambiente no painel da Vercel.
- **Rotas do SPA:** garantir *rewrite* de todas as rotas para `index.html` no `vercel.json` (ex.: `/billing/pix/:id` aberto direto pelo link do e-mail não pode dar 404).

**Entidade emissora:** GVF Serviços de Tecnologia Ltda (Ponderum).

---

## 1. Visão geral: as 10 peças

| # | Peça | O que resolve | Construir agora (mock) | Depende do MP |
|---|------|---------------|------------------------|---------------|
| 0 | **Nunca guardar cartão** | Cartão salvo no nosso banco = vazamento e proibição (PCI-DSS/LGPD) | Regra de arquitetura + validações | Brick tokeniza no navegador |
| 1 | **Gateway** | Quem de fato cobra | Interface `PaymentProvider` + `MockProvider` | `MercadoPagoProvider` |
| 2 | **Webhook** | Saber que o cliente pagou ("AVISO: PAGO") | Endpoint, fila de eventos, processador | Validação da assinatura `x-signature` |
| 3 | **Idempotência** | Aviso repetido (#42 de novo) é ignorado; nada é cobrado nem liberado em dobro | Tabelas com UNIQUE + chaves de idempotência | Header `X-Idempotency-Key` |
| 4 | **Pix com QR Code** | Pagamento na hora, QR com validade de 30 min | Tela do QR + polling + expiração | `payment_method_id: "pix"` |
| 5 | **Assinatura recorrente** | Cobrar todo mês no mesmo dia | Planos, ciclo, estados, renovação | `preapproval` (cartão) |
| 6 | **Recuperação de cobrança** | Cartão recusado → tentar de novo / trocar cartão | Máquina de estados *past_due*, e-mails, tela "atualizar cartão" | Retentativas automáticas do MP |
| 7 | **Botão de cancelar** | Cliente cancela sozinho | Fluxo de cancelamento self-service | `PUT /preapproval/{id}` |
| 8 | **Chargeback + antifraude** | "Não fui eu" → -R$ e perda de acesso; barrar compra suspeita | Tratamento de contestação, regras de risco | Tópico `topic_chargebacks_wh`, dados de antifraude |
| 9 | **Repasse** | "Vendido R$ 100, na conta R$ 0, cai em 30 dias, R$ 5 de taxa" | Registro de taxa, valor líquido e data de liberação; painel financeiro | Campos `fee_details`, `money_release_date` |
| 10 | **Nota fiscal** | Emitir nota a cada pagamento, sozinho | Fila de emissão com provedor plugável (mock) | Provedor de NFS-e (não é o MP) |

---

## 2. Princípios inegociáveis

1. **Dados de cartão nunca tocam nosso backend nem nosso banco.** Número, CVV e validade completa são digitados no **Card Payment Brick** (iframe do MP), que devolve um `token` de uso único. Guardamos no máximo: bandeira, últimos 4 dígitos, mês e ano de validade, `customer_id` e `card_id` do MP.
2. **O webhook é a única fonte da verdade.** O retorno do front ("pagamento aprovado!") é só UX. O acesso é liberado **somente** quando o backend confirmar o status consultando o gateway.
3. **Nunca confiar no corpo do webhook.** O webhook só diz "algo mudou no recurso X". O processador sempre faz `GET` no recurso (`/v1/payments/{id}`, `/preapproval/{id}`…) e usa a resposta da API.
4. **Tudo idempotente.** Processar o mesmo evento 1 ou 10 vezes produz o mesmo resultado.
5. **Gateway atrás de interface.** Regras de negócio chamam `PaymentProvider`, nunca o SDK direto.
6. **Dinheiro em centavos (`integer`)**, nunca `float`. Moeda fixa `BRL`.
7. **Toda mudança de estado gera um registro de auditoria** (`billing_audit_log`).
8. **Segredos só em variáveis de ambiente das Edge Functions.** O front recebe apenas a `PUBLIC_KEY`.

---

## 3. Arquitetura

```
┌──────────────┐  token do cartão   ┌──────────────────────┐
│  React app   │ ─────────────────▶ │ Edge Function        │
│ (Card Brick) │ ◀── status/QR ──── │ billing-api          │
└──────┬───────┘                    │  (checkout, cancelar,│
       │ Realtime / polling         │   trocar cartão)     │
       ▼                            └─────────┬────────────┘
┌──────────────┐                              │ PaymentProvider
│  Supabase DB │ ◀────────────────────────────┤ (Mock | MercadoPago)
│  (Postgres)  │                              ▼
└──────▲───────┘                    ┌──────────────────────┐
       │                            │   Mercado Pago API   │
       │ upsert idempotente         └─────────┬────────────┘
┌──────┴───────────────┐   webhook (POST)     │
│ Edge Function        │ ◀────────────────────┘
│ billing-webhook      │ → grava em webhook_events → processa
└──────────────────────┘
┌──────────────────────┐
│ pg_cron jobs         │ renovação Pix, dunning, expiração, conciliação, NFS-e
└──────────────────────┘
```

### Estrutura de pastas sugerida

```
supabase/
  migrations/                      # SQL do modelo de dados (seção 4)
  functions/
    _shared/billing/
      provider.ts                  # interface PaymentProvider + tipos
      providers/mock.ts            # MockProvider (agora)
      providers/mercadopago.ts     # MercadoPagoProvider (depois)
      providers/index.ts           # factory: lê PAYMENT_PROVIDER=mock|mercadopago
      domain/subscriptions.ts      # máquina de estados da assinatura
      domain/payments.ts           # aplicação de eventos de pagamento
      domain/entitlements.ts       # o que o cliente pode usar
      domain/invoices.ts           # fila de NFS-e
      invoice-providers/           # interface InvoiceProvider + mock
      money.ts                     # helpers de centavos/BRL
    billing-api/                   # endpoints chamados pelo app
    billing-webhook/               # recebe webhooks
    billing-jobs/                  # chamado pelo pg_cron
    billing-dev-simulator/         # SÓ em dev: simula eventos do gateway
src/
  features/billing/
    pages/ PlansPage, CheckoutPage, PixPaymentPage, BillingSettingsPage,
           UpdateCardPage, CancelFlow, AdminFinancePage
    components/ CardBrick (wrapper), PixQrCode, SubscriptionStatusBanner, PlanCard
    hooks/ useSubscription, useEntitlements, usePaymentStatus
```

### Interface do gateway (contrato)

```ts
// supabase/functions/_shared/billing/provider.ts
export type Cents = number;

export interface PaymentProvider {
  readonly name: 'mock' | 'mercadopago';

  // Clientes e cartões (cartão sempre via token gerado no front)
  upsertCustomer(input: { userId: string; email: string; name: string; document: string /* CPF/CNPJ */ }): Promise<{ providerCustomerId: string }>;

  // Pagamento avulso
  createCardPayment(input: {
    idempotencyKey: string; amount: Cents; description: string;
    cardToken: string; installments: number; payer: PayerInfo;
    externalReference: string; // = payments.id interno
  }): Promise<ProviderPayment>;

  createPixPayment(input: {
    idempotencyKey: string; amount: Cents; description: string;
    payer: PayerInfo; expiresAt: Date; externalReference: string;
  }): Promise<ProviderPayment & { pix: { qrCode: string; qrCodeBase64: string; ticketUrl?: string; expiresAt: Date } }>;

  getPayment(providerPaymentId: string): Promise<ProviderPayment>;
  refundPayment(input: { idempotencyKey: string; providerPaymentId: string; amount?: Cents }): Promise<ProviderRefund>;

  // Assinatura recorrente (cartão)
  createSubscription(input: {
    idempotencyKey: string; planCode: string; amount: Cents;
    frequency: 1; frequencyType: 'months';
    cardToken: string; payerEmail: string; externalReference: string; // = subscriptions.id
    startDate?: Date;
  }): Promise<ProviderSubscription>;
  getSubscription(providerSubscriptionId: string): Promise<ProviderSubscription>;
  updateSubscriptionCard(input: { providerSubscriptionId: string; cardToken: string }): Promise<ProviderSubscription>;
  updateSubscriptionAmount(input: { providerSubscriptionId: string; amount: Cents }): Promise<ProviderSubscription>;
  cancelSubscription(providerSubscriptionId: string): Promise<ProviderSubscription>;
  pauseSubscription(providerSubscriptionId: string): Promise<ProviderSubscription>;

  // Webhook
  verifyWebhook(req: { headers: Headers; query: URLSearchParams; rawBody: string }): Promise<boolean>;
  parseWebhook(req: { headers: Headers; query: URLSearchParams; body: unknown }): NormalizedWebhookEvent;

  // Contestação
  getChargeback(providerChargebackId: string): Promise<ProviderChargeback>;
}

export type NormalizedWebhookEvent = {
  providerEventId: string;          // id da notificação
  resourceType: 'payment' | 'subscription' | 'subscription_payment' | 'chargeback' | 'unknown';
  resourceId: string;               // data.id
  action?: string;                  // ex.: payment.created, payment.updated
  receivedAt: Date;
};

export type ProviderPaymentStatus =
  | 'pending' | 'approved' | 'authorized' | 'in_process' | 'in_mediation'
  | 'rejected' | 'cancelled' | 'refunded' | 'charged_back';

export type ProviderPayment = {
  providerPaymentId: string; status: ProviderPaymentStatus; statusDetail?: string;
  method: 'card' | 'pix'; amount: Cents; netAmount?: Cents; feeAmount?: Cents;
  moneyReleaseDate?: Date; approvedAt?: Date; externalReference?: string;
  providerSubscriptionId?: string; card?: { brand: string; last4: string; expMonth: number; expYear: number };
  raw: unknown; // resposta original, salva para auditoria
};
```

O **`MockProvider`** implementa tudo isso em memória/banco, gerando IDs falsos (`mock_pay_…`), QR Code falso (pode ser um QR real com texto "PIX-MOCK-…") e permitindo que o simulador dispare eventos (seção 11).

---

## 4. Modelo de dados (Supabase / Postgres)

Todas as tabelas com `created_at`/`updated_at` e **RLS ligado**. O usuário só lê o que é da própria organização; escrita de status **só via service role** (Edge Functions). Ajustar `organizations`/`organization_members` aos nomes reais do projeto.

```sql
-- Planos (configuráveis, sem hardcode no front)
create table billing_plans (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,                -- ex.: 'essencial_mensal'
  name text not null,
  price_cents integer not null check (price_cents > 0),
  interval text not null default 'month' check (interval in ('month','year')),
  trial_days integer not null default 0,
  features jsonb not null default '{}',     -- ex.: {"contracts_per_month": 30, "seats": 3}
  is_active boolean not null default true,
  sort_order integer not null default 0
);

-- Cliente no gateway (1 por organização)
create table billing_customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references organizations(id),
  provider text not null,                   -- 'mock' | 'mercadopago'
  provider_customer_id text,
  legal_name text not null,
  document_type text not null check (document_type in ('CPF','CNPJ')),
  document_number text not null,            -- só dígitos
  email text not null,
  address jsonb,                            -- necessário para NFS-e
  unique (provider, provider_customer_id)
);

-- Cartão: SOMENTE metadados exibíveis. Proibido número/CVV.
create table billing_payment_methods (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references billing_customers(id),
  provider_card_id text,
  brand text, last4 char(4), exp_month smallint, exp_year smallint,
  is_default boolean not null default true
);

create type subscription_status as enum
  ('incomplete','trialing','active','past_due','paused','canceled','expired');

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  plan_id uuid not null references billing_plans(id),
  status subscription_status not null default 'incomplete',
  payment_method text not null check (payment_method in ('card','pix')),
  provider text not null,
  provider_subscription_id text,            -- preapproval id (cartão)
  billing_day smallint not null check (billing_day between 1 and 28),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  cancel_reason text,
  past_due_since timestamptz,
  grace_period_ends_at timestamptz,
  unique (provider, provider_subscription_id)
);
-- no máximo 1 assinatura "viva" por organização
create unique index one_live_subscription_per_org on subscriptions(organization_id)
  where status in ('incomplete','trialing','active','past_due','paused');

create type payment_status as enum
  ('pending','approved','in_process','rejected','cancelled','expired','refunded','partially_refunded','charged_back','in_mediation');

create table payments (
  id uuid primary key default gen_random_uuid(),          -- vai como external_reference
  organization_id uuid not null references organizations(id),
  subscription_id uuid references subscriptions(id),
  provider text not null,
  provider_payment_id text,
  idempotency_key text not null unique,
  method text not null check (method in ('card','pix')),
  status payment_status not null default 'pending',
  status_detail text,
  amount_cents integer not null,
  fee_cents integer,                         -- peça 9
  net_cents integer,                         -- peça 9
  money_release_date timestamptz,            -- peça 9
  released boolean not null default false,   -- peça 9
  period_start timestamptz, period_end timestamptz,  -- que período este pagamento cobre
  pix_qr_code text, pix_qr_code_base64 text, pix_expires_at timestamptz,
  approved_at timestamptz,
  raw_last_response jsonb,
  unique (provider, provider_payment_id)
);

-- Peça 2 + 3: todo webhook é gravado antes de processar
create table webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text,
  resource_type text not null,
  resource_id text not null,
  action text,
  signature_valid boolean not null,
  payload jsonb not null,
  status text not null default 'received' check (status in ('received','processing','processed','ignored','failed')),
  attempts integer not null default 0,
  last_error text,
  processed_at timestamptz,
  unique (provider, provider_event_id)
);
create index on webhook_events(status) where status in ('received','failed');

-- Peça 8
create table chargebacks (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments(id),
  provider_chargeback_id text not null,
  status text not null,                       -- opened | documentation_pending | won | lost
  amount_cents integer not null,
  reason text,
  documentation_due_at timestamptz,
  unique (provider_chargeback_id)
);

-- Peça 10
create table fiscal_invoices (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null unique references payments(id),   -- 1 nota por pagamento
  provider text not null,                      -- 'mock' | 'focus' | 'nfeio' | ...
  provider_invoice_id text,
  status text not null default 'queued' check (status in ('queued','processing','issued','error','canceled')),
  number text, verification_code text, pdf_url text, xml_url text,
  attempts integer not null default 0,
  last_error text,
  issued_at timestamptz
);

create table billing_audit_log (
  id bigserial primary key,
  organization_id uuid,
  entity text not null, entity_id uuid,
  from_status text, to_status text,
  actor text not null,                         -- 'webhook' | 'user:<id>' | 'job:<nome>' | 'admin:<id>'
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- Peça 8: sinais simples de risco
create table checkout_attempts (
  id bigserial primary key,
  user_id uuid, organization_id uuid, ip inet,
  method text, outcome text,                   -- approved | rejected | blocked
  created_at timestamptz not null default now()
);
```

**View `organization_entitlements`** (usada pelo app inteiro para decidir acesso):
`has_access = status in ('trialing','active') or (status = 'past_due' and now() < grace_period_ends_at) or (status = 'canceled' and now() < current_period_end)`, mais os `features` do plano.

---

## 5. Máquinas de estado

### Assinatura

```
incomplete ──(1º pagamento aprovado)──▶ active
incomplete ──(trial configurado)──────▶ trialing ──(cobrança aprovada)──▶ active
active ──(renovação aprovada)────────▶ active (avança current_period_*)
active ──(renovação recusada)────────▶ past_due (past_due_since=now, grace=now+7d)
past_due ──(pagamento aprovado / novo cartão)──▶ active
past_due ──(fim da carência)─────────▶ paused (sem acesso) ──(30 dias)──▶ expired
active ──(cliente cancela)───────────▶ active + cancel_at_period_end=true ──(fim do período)──▶ canceled
qualquer ──(chargeback aberto)───────▶ paused (acesso suspenso) + flag de risco
incomplete ──(24h sem pagar)──────────▶ expired
```

Regras:
- Transição só via função `transitionSubscription(id, to, actor, metadata)` que valida a transição, grava `billing_audit_log` e é idempotente (transição para o mesmo estado = no-op).
- O MP também cancela sozinho uma assinatura após **3 parcelas recusadas**: ao receber `subscription_preapproval` com status `cancelled` sem pedido nosso, transicionar para `canceled` com `cancel_reason='provider_auto_cancel'`.

### Pagamento
`pending → approved | rejected | cancelled | expired`; `approved → refunded | partially_refunded | in_mediation → charged_back`. **Nunca regredir** de `approved` para `pending` (eventos fora de ordem): aplicar só transições "para frente".

---

## 6. Especificação por peça

### Peça 0 — Nunca guardar o cartão
- Front usa **Card Payment Brick** (`@mercadopago/sdk-react`) com a `PUBLIC_KEY`. O Brick devolve `token`, `payment_method_id`, `issuer_id`, `installments`, últimos 4 dígitos.
- Backend recebe **apenas** o token.
- Agora (mock): componente `CardBrick` com a mesma interface de props/retorno; em `mock` renderiza um formulário fake que **não envia** número de cartão ao backend, apenas um `mock_tok_…`. Cartões de teste: final `0000` aprova, `0001` recusa (`cc_rejected_insufficient_amount`), `0002` vai para `in_process`.
- **Critérios de aceite:** nenhuma coluna, log, payload ou Sentry contém número completo/CVV; lint/teste que falha se aparecer campo `card_number`/`cvv` no backend; logs passam por um sanitizador.

### Peça 1 — Gateway
- `providers/index.ts` lê `PAYMENT_PROVIDER` (`mock` padrão em dev/staging).
- Todas as chamadas de saída (`POST`) enviam **`X-Idempotency-Key`** = `payments.idempotency_key` (UUID gerado por nós antes da chamada).
- Timeouts de 10 s, 2 retentativas com backoff só em erro de rede/5xx (a mesma idempotency key garante que não haja cobrança dupla).
- Enviar `external_reference` = nosso ID interno e `notification_url` = URL da Edge Function de webhook.
- **Ligar depois:** `MercadoPagoProvider` usando a API REST (`/v1/payments`, `/v1/customers`, `/preapproval`, `/authorized_payments/{id}`, `/v1/payments/{id}/refunds`, `/v1/chargebacks/{id}`) com `Authorization: Bearer ${MP_ACCESS_TOKEN}`.

### Peça 2 — Webhook
Edge Function `billing-webhook` (pública, sem JWT do Supabase):
1. Ler corpo bruto + headers + query.
2. `provider.verifyWebhook()`. Se inválido: gravar evento com `signature_valid=false`, responder **401** e não processar.
3. `insert ... on conflict (provider, provider_event_id) do nothing` em `webhook_events`.
4. Responder **200 imediatamente** (o MP espera resposta em até ~22 s e reenvia periodicamente se não receber 200/201).
5. Processar de forma assíncrona (o mesmo request após responder, ou via job `process-webhooks` a cada minuto que pega `status in ('received','failed') and attempts < 10`).
6. Processador: `SELECT ... FOR UPDATE SKIP LOCKED`, marca `processing`, faz **GET do recurso na API**, aplica no domínio, marca `processed` (ou `failed` + `last_error`).

Roteamento por tipo:
| Tópico MP | Ação |
|---|---|
| `payment` | `GET /v1/payments/{id}` → `applyPaymentUpdate()` |
| `subscription_preapproval` | `GET /preapproval/{id}` → sincroniza status/cartão da assinatura |
| `subscription_authorized_payment` | `GET /authorized_payments/{id}` → acha o `payment` vinculado → `applyPaymentUpdate()` |
| `topic_chargebacks_wh` | `GET /v1/chargebacks/{id}` → `applyChargeback()` |
| outros | `ignored` |

**Validação de assinatura do MP (implementar no `MercadoPagoProvider`; conferir na documentação oficial no momento de ligar):**
- Header `x-signature`: `ts=<timestamp>,v1=<hash>`; header `x-request-id`; `data.id` vem na query string.
- Manifest: `id:${dataId};request-id:${xRequestId};ts:${ts};` (o `data.id` em minúsculas se for alfanumérico).
- `v1` = HMAC-SHA256(manifest, `MP_WEBHOOK_SECRET`) em hex. Comparar com `timingSafeEqual`. Rejeitar `ts` com mais de 5 min de diferença.
- Observação: notificações de QR Code não têm assinatura verificável → para Pix, a segurança vem do passo "sempre fazer GET na API".

**Front:** após checkout, a tela escuta mudança no `payments.status` via **Supabase Realtime** (fallback: polling a cada 3 s por até 10 min) e mostra "Pagamento confirmado" só quando o banco disser `approved`.

### Peça 3 — Idempotência
Camadas obrigatórias:
1. **Entrada:** `webhook_events` com UNIQUE (`provider`, `provider_event_id`). Evento repetido → `ignored`.
2. **Domínio:** `payments` UNIQUE (`provider`, `provider_payment_id`); `applyPaymentUpdate` é um *upsert* que só avança estado. Liberar acesso, emitir nota e enviar e-mail são **efeitos colaterais protegidos**: cada um verifica se já foi feito (ex.: `fiscal_invoices.payment_id` UNIQUE; tabela `billing_notifications_sent(payment_id, template)` UNIQUE).
3. **Saída:** `X-Idempotency-Key` em toda criação de cobrança. Clique duplo no "Pagar" usa a mesma chave (gerada ao abrir o checkout e guardada no estado da tela).
4. **Front:** botão "Pagar" desabilitado durante o envio.
- **Critério de aceite:** teste que envia o mesmo webhook 5× em paralelo → 1 pagamento aprovado, 1 período estendido, 1 nota na fila, 1 e-mail.

### Peça 4 — Pix com QR Code
- `POST billing-api/checkout/pix` → cria `payments` (`pending`) → `provider.createPixPayment()` com `date_of_expiration = now + 30 min` (configurável; o MP aceita de 30 min até 30 dias).
- Resposta do MP traz `point_of_interaction.transaction_data.qr_code` (copia e cola), `qr_code_base64` (imagem) e `ticket_url`. Salvar em `payments`.
- Tela `PixPaymentPage`: QR grande, botão "Copiar código Pix", contador regressivo, status em tempo real. Ao expirar: estado "Expirado" + botão "Gerar novo QR" (novo pagamento e nova idempotency key).
- Job `expire-pix` (a cada 5 min): `pending` + `pix_expires_at < now()` → consulta o gateway; se ainda pendente → `expired`.
- **Pix em assinatura:** o `preapproval` do MP é cobrança automática no cartão. Para clientes que preferem Pix, a recorrência é **nossa**: o job `generate-pix-renewals` cria a cobrança Pix **5 dias antes** do vencimento com validade até o fim da carência, e envia por e-mail com link para a tela do QR. Sem pagamento → dunning (peça 6).
- Mock: QR gerado localmente; simulador permite "pagar" ou "expirar".

### Peça 5 — Assinatura recorrente
- `PlansPage` lê `billing_plans` ativos. Checkout escolhe plano + método (cartão ou Pix).
- **Cartão:** `POST billing-api/subscriptions` com `cardToken` → cria `subscriptions` (`incomplete`) → `provider.createSubscription()` (MP: `POST /preapproval` com `status: "authorized"`, `card_token_id`, `payer_email`, `external_reference`, `auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount, currency_id: "BRL" }`). O MP valida o cartão com uma cobrança pequena que é estornada e cobra a 1ª parcela em cerca de 1 hora → **a ativação vem pelo webhook**, não pela resposta síncrona. A tela mostra "Ativando sua assinatura…" com Realtime.
- **Pix:** 1º pagamento via peça 4; aprovado → `active`; renovações pelo job da peça 4.
- `billing_day` = dia da primeira cobrança (limitado a 28 para evitar meses curtos).
- Cada pagamento aprovado estende `current_period_end` em 1 intervalo **a partir do período anterior**, não de `now()` (evita "perder dias" quando o pagamento atrasa).
- **Troca de plano (upgrade/downgrade):** v1 simples — upgrade vale na hora com novo valor a partir do próximo ciclo (`updateSubscriptionAmount`); downgrade vale no próximo ciclo. Proporcional (*proration*) fica fora do escopo da v1.
- **Entitlements:** todo recurso pago (análise de contrato, assentos, limites) checa `organization_entitlements` **no backend** (Edge Function/RLS), nunca só no front.

### Peça 6 — Recuperação de cobrança (dunning)
- O MP já faz até **4 retentativas em uma janela de ~10 dias** para parcelas de `preapproval` recusadas (status da parcela `recycling`). Nós **não** recobramos o cartão por conta própria; nós cuidamos da comunicação e do acesso:
  - 1ª recusa → `past_due`, carência de **7 dias** (configurável) com acesso mantido, banner vermelho no app "Não conseguimos cobrar seu cartão — atualize a forma de pagamento".
  - E-mails: D0 (recusa), D+3, D+6 (último aviso), D+7 (acesso suspenso).
  - **Tela "Atualizar cartão"** (`UpdateCardPage`): novo Brick → `provider.updateSubscriptionCard()` (MP: `PUT /preapproval/{id}` com novo `card_token_id`) → dispara nova tentativa → aprovação → `active`.
  - Alternativa na mesma tela: "Pagar esta fatura com Pix agora".
  - Fim da carência sem pagamento → `paused` (sem acesso, dados preservados) → 30 dias → `expired`.
- Usar `status_detail` para mensagens úteis (saldo insuficiente, cartão vencido, recusado pelo banco).
- Mock: o simulador permite "recusar renovação", "aprovar retentativa" e "auto-cancelar após 3 recusas".

### Peça 7 — Botão de cancelar
- Em `BillingSettingsPage`: botão "Cancelar assinatura" visível, **no máximo 2 cliques** até confirmar (sem labirinto; o Decreto 11.034/2022 exige facilitar o cancelamento).
- Fluxo: confirmação com o que acontece ("Você mantém acesso até DD/MM") → motivo opcional (lista + texto) → confirmar.
- Backend: `provider.cancelSubscription()` (MP: `PUT /preapproval/{id}` com `status: "cancelled"`) → `cancel_at_period_end = true`, `canceled_at`, `cancel_reason` → e-mail de confirmação com protocolo.
- Acesso continua até `current_period_end`; job `close-canceled` muda para `canceled` depois disso.
- "Reativar" disponível enquanto o período não terminar (cria nova assinatura começando em `current_period_end`).
- **Direito de arrependimento (7 dias, CDC art. 49):** se o cliente for consumidor final (CPF) e cancelar em até 7 dias da 1ª contratação → estorno integral automático (`refundPayment`). Política para CNPJ e reembolso proporcional: **decisão em aberto (seção 13)**, deixar configurável.
- Cancelar não apaga dados. Exclusão de conta é outro fluxo (LGPD).

### Peça 8 — Chargeback e antifraude
**Chargeback ("não fui eu"):**
- Webhook `topic_chargebacks_wh` (ou pagamento passando a `in_mediation`/`charged_back`) → cria `chargebacks` → pagamento `charged_back` → assinatura `paused` (acesso suspenso) → marcar a organização com `risk_flag = true` → alerta para o admin (e-mail + item no painel).
- Painel admin mostra prazo para enviar documentação de defesa e gera um **pacote de evidências** automaticamente: dados do contratante, IP/data do aceite dos termos, logs de uso da plataforma depois do pagamento (contratos analisados), e-mails enviados, nota fiscal.
- Organização com chargeback não pode reassinar com cartão sem liberação do admin (só Pix).

**Antifraude (o MP tem antifraude próprio; nós melhoramos o sinal e colocamos barreiras baratas):**
- Enviar ao MP dados completos do pagador: nome, e-mail, CPF/CNPJ, telefone, endereço, e `additional_info.items` (plano). O SDK do MP no front coleta o *device id* automaticamente: garantir que o script do MP seja carregado na página de checkout.
- Regras locais (via `checkout_attempts`):
  - Exigir e-mail verificado antes do checkout.
  - Máx. **3 recusas de cartão por organização em 24 h** e **10 por IP em 1 h** → bloquear cartão naquele período (oferecer Pix).
  - Nome do titular/CPF divergente do cadastro → apenas registrar o sinal (não bloquear) na v1.
- Pagamento `rejected` com `status_detail` de alto risco (`cc_rejected_high_risk`) → mensagem neutra ("Não foi possível aprovar. Tente outro cartão ou Pix"); nunca expor o motivo antifraude.

### Peça 9 — Repasse (quanto e quando o dinheiro cai)
- Ao aplicar pagamento aprovado, salvar do objeto do MP: `fee_details` (soma → `fee_cents`), `transaction_details.net_received_amount` → `net_cents`, `money_release_date`.
- Pix costuma liberar na hora; cartão segue o prazo configurado na conta do MP (ex.: 14 ou 30 dias). **Não hardcodar:** sempre usar `money_release_date` do pagamento.
- `AdminFinancePage` (só admins da Ponderum):
  - Cards: Vendido (bruto), Taxas, Líquido, **A liberar** (aprovado e `money_release_date > now`), Liberado.
  - Calendário/lista "cai em": soma por data de liberação.
  - MRR, assinantes ativos, inadimplentes (`past_due`), churn do mês, chargebacks abertos.
  - Exportar CSV (para o contador).
- Job diário `reconcile` (03:00): para pagamentos dos últimos 35 dias, consulta o gateway e corrige divergências de status/valor (registrar no audit log). Rede de segurança caso algum webhook se perca.
- Mock: taxa simulada configurável (ex.: cartão 4,98%, Pix 0,99%) e liberação simulada (cartão +30 d, Pix imediato).

### Peça 10 — Nota fiscal automática
- Ponderum é **serviço (SaaS)** → nota é **NFS-e** (municipal / padrão nacional), não NF-e de produto. **O Mercado Pago não emite nota**: usar um provedor de API de NFS-e (ex.: Focus NFe, NFE.io, eNotas, PlugNotas). Escolha do provedor = decisão em aberto.
- Interface `InvoiceProvider` (`issue`, `get`, `cancel`) + `MockInvoiceProvider` agora.
- Gatilho: pagamento → `approved` ⇒ `insert into fiscal_invoices (payment_id) ... on conflict do nothing` (1 nota por pagamento, idempotente).
- Job `issue-invoices` (a cada 5 min): pega `queued`/`error` com `attempts < 5`, emite, guarda número/PDF/XML; status `processing` até o provedor confirmar (emissão de NFS-e é assíncrona em muitos municípios → tratar webhook ou polling do provedor).
- Dados necessários do tomador: razão social/nome, CPF/CNPJ, e-mail, endereço com CEP/município. **Coletar no checkout** (obrigatório para CNPJ; checar com o contador o que é obrigatório para CPF).
- Dados do prestador em configuração: CNPJ da GVF, inscrição municipal, regime tributário, código de serviço (LC 116, provavelmente item 1.05/1.03, **confirmar com o contador**), alíquota de ISS, descrição padrão ("Assinatura mensal Ponderum – Plano X – período DD/MM a DD/MM").
- Estorno/arrependimento → cancelar a NFS-e via provedor (dentro do prazo municipal) ou registrar pendência para o contador.
- E-mail ao cliente com PDF/link da nota; nota disponível em "Faturas" no app.
- Erro de emissão após 5 tentativas → alerta para admin; **nunca bloquear o acesso do cliente por erro de nota**.

---

## 7. Telas (front)

| Tela | Conteúdo |
|---|---|
| `PlansPage` | Cards de planos vindos do banco, plano atual destacado |
| `CheckoutPage` | Dados de faturamento (nome/razão social, CPF/CNPJ com validação de dígito, endereço via CEP), escolha cartão/Pix, Brick, aceite dos Termos (gravar IP + data + versão) |
| `PixPaymentPage` | QR, copia e cola, contador, status em tempo real, "gerar novo" |
| `CheckoutResult` | Processando / Aprovado / Recusado (mensagem por `status_detail`, oferecer Pix) |
| `BillingSettingsPage` | Plano, status, próxima cobrança (data + valor), cartão (bandeira •••• 1234), trocar plano, atualizar cartão, cancelar, histórico de faturas (pagamento + NFS-e) |
| `UpdateCardPage` | Brick + "pagar com Pix agora" |
| `CancelFlow` | Modal de 2 passos |
| `SubscriptionStatusBanner` | Global: trial acabando, past_due, pausado, cancelamento agendado |
| `AdminFinancePage` | Peça 9 + listas de past_due, chargebacks, notas com erro, webhooks com falha (com botão "reprocessar") |

Identidade visual: paleta navy/emerald/teal, Inter para UI, JetBrains Mono para valores/códigos. Tom institucional.

## 8. E-mails transacionais (templates)
Boas-vindas/assinatura ativa · Pagamento aprovado (com nota) · Pix gerado (renovação) · Pix vencendo amanhã · Pagamento recusado (D0, D+3, D+6) · Acesso suspenso · Cartão atualizado · Cancelamento confirmado (protocolo) · Período encerrado · Estorno realizado · Chargeback aberto (interno).
Envio idempotente via `billing_notifications_sent`.

## 9. Jobs agendados (pg_cron → Edge Function `billing-jobs`)

| Job | Frequência | Função |
|---|---|---|
| `process-webhooks` | 1 min | Processa `received`/`failed` |
| `expire-pix` | 5 min | Expira Pix vencidos |
| `issue-invoices` | 5 min | Emite NFS-e na fila |
| `generate-pix-renewals` | diário 08:00 | Cria Pix de renovação D-5 |
| `dunning` | diário 09:00 | E-mails D+3/D+6, fim da carência → `paused` |
| `close-canceled` | horário | `cancel_at_period_end` vencidos → `canceled` |
| `expire-incomplete` | horário | `incomplete` > 24h → `expired` |
| `reconcile` | diário 03:00 | Concilia com o gateway |
| `release-funds` | diário | Marca `released=true` quando `money_release_date <= now` |

Todos os horários em America/Sao_Paulo. Todos idempotentes e seguros para rodar 2× simultaneamente (`FOR UPDATE SKIP LOCKED` ou advisory lock).

## 10. Segurança e LGPD
- `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, chave do provedor de NFS-e: só nos *secrets* das Edge Functions. Front (variáveis da Vercel): só a public key do MP (`VITE_MP_PUBLIC_KEY` se o app usa Vite; `NEXT_PUBLIC_MP_PUBLIC_KEY` se for Next.js).
- RLS: usuário lê `subscriptions`, `payments` (sem `raw_last_response`), `fiscal_invoices` da própria organização; nenhuma escrita direta. Tabelas `webhook_events`, `billing_audit_log`, `checkout_attempts`, `chargebacks` → só service role/admin.
- CPF/CNPJ e endereço são dados pessoais: mascarar em logs; incluir na política de privacidade (finalidade: faturamento e emissão fiscal; base legal: execução de contrato e obrigação legal).
- Retenção: dados fiscais e financeiros mantidos pelo prazo legal (5 anos) mesmo após exclusão de conta → anonimizar o resto.
- Webhook: validação de assinatura + "sempre GET na API" + rate limit.
- Somente HTTPS; CSP definida nos `headers` do `vercel.json`, permitindo os domínios do SDK do MP (script, iframe do Brick e conexões) na página de checkout.

## 11. Testes e simulador
- **`billing-dev-simulator`** (desabilitado em produção por env): endpoint + painel em `/dev/billing` para disparar, contra o `MockProvider`: aprovar/recusar pagamento, pagar/expirar Pix, renovar, recusar renovação, aprovar retentativa, auto-cancelar após 3 recusas, abrir/ganhar/perder chargeback, reenviar o mesmo webhook N vezes, enviar webhook com assinatura inválida, enviar eventos fora de ordem.
- **Unitários:** máquina de estados (todas as transições válidas e inválidas), cálculo de período, dinheiro em centavos, validação de assinatura (com vetores de teste), sanitizador de logs.
- **Integração (Supabase local):** fluxos completos: assinatura cartão → ativa → renova → recusa → atualiza cartão → ativa → cancela → encerra; idem Pix; webhook duplicado 5× em paralelo; chargeback.
- **E2E (Playwright):** checkout cartão (mock), checkout Pix (mock), cancelar, atualizar cartão.
- Quando o MP estiver ligado: repetir integração com **credenciais de teste e usuários de teste do MP** e os cartões de teste oficiais.

---

## 12. Plano de execução (tarefas para os agentes)

**Fase 0 — Diagnóstico do que já existe (obrigatória, sem alterar código)**
0.1. Varrer o repositório e o banco (migrations, `supabase/functions`, `src/`) atrás de tudo que é pagamento: planos, preços, checkout, assinatura, Mercado Pago, Pix, webhook, Stripe/outros gateways, campos como `plan`, `status`, `is_paid`, `trial`.
0.2. Preencher a tabela da seção 0 com o que encontrou (situação + caminho dos arquivos).
0.3. Gerar `docs/billing-gap-report.md` com, para cada peça (0 a 10):
   - **O que existe** (arquivos, tabelas, funções)
   - **Conforme a spec?** sim / parcial / não
   - **Lacunas** (o que falta)
   - **Conflitos** (onde o existente viola a seção 2: cartão salvo, acesso liberado pelo front, gateway chamado direto fora da interface, valores em `float`, webhook sem idempotência etc.)
   - **Ação proposta:** manter / adaptar / substituir, com estimativa de esforço
0.4. Propor a **ordem ajustada das fases 1–6** considerando o que já está pronto (pular ou encurtar tarefas concluídas).
0.5. **Parar e aguardar aprovação do Vitor** antes de iniciar a Fase 1. Não apagar nem migrar dados existentes sem aprovação explícita.

**Fase 1 — Fundação (sem MP)**
1. Migrations da seção 4 + RLS + view `organization_entitlements` + seeds de planos (valores placeholder).
2. `provider.ts` (interface + tipos), `money.ts`, factory, `MockProvider` completo.
3. `domain/subscriptions.ts` (máquina de estados + audit log) e `domain/payments.ts` (`applyPaymentUpdate` só para frente) com testes unitários.

**Fase 2 — Webhook e idempotência**
4. `billing-webhook` (gravar → 200 → processar), processador com roteamento, `X-Idempotency-Key` nas saídas.
5. `billing-dev-simulator` + painel `/dev/billing`.
6. Teste de webhook duplicado/paralelo/fora de ordem.

**Fase 3 — Checkout**
7. `CardBrick` (wrapper com modo mock), `CheckoutPage` com dados de faturamento e aceite dos termos.
8. Assinatura com cartão (peça 5) + Realtime de status.
9. Pix (peça 4) + `PixPaymentPage` + `expire-pix`.
10. Gating de entitlements no backend dos recursos pagos.

**Fase 4 — Ciclo de vida**
11. Renovação (cartão via eventos; Pix via `generate-pix-renewals`).
12. Dunning (peça 6) + `UpdateCardPage` + banners + e-mails.
13. Cancelamento (peça 7) + arrependimento + `close-canceled`.

**Fase 5 — Risco, dinheiro e fiscal**
14. Chargeback + regras antifraude (peça 8).
15. Campos de repasse + `AdminFinancePage` + `reconcile` + CSV (peça 9).
16. `InvoiceProvider` + mock + fila `issue-invoices` + faturas no app (peça 10).

**Fase 6 — Ligar o Mercado Pago (quando a conta for aprovada)**
17. Implementar `MercadoPagoProvider` (mesma interface; passar a suíte de contrato que o mock passa).
18. Configurar no painel do MP: aplicação, webhook apontando para `billing-webhook` com os tópicos `payment`, `subscription_preapproval`, `subscription_authorized_payment`, `topic_chargebacks_wh`; copiar a assinatura secreta.
19. Rodar a suíte de integração com credenciais de teste → homologação → `PAYMENT_PROVIDER=mercadopago` em produção.
20. Implementar o provedor real de NFS-e (após escolha + configuração com o contador).

### Checklist de go-live
- [ ] Credenciais de produção nos secrets do Supabase; `PAYMENT_PROVIDER=mercadopago`
- [ ] Public key de produção do MP só no ambiente *Production* da Vercel (Preview continua com mock/teste)
- [ ] Webhook de produção configurado e testado (evento real de R$ 1,00 + estorno)
- [ ] Simulador desligado em produção
- [ ] Prazo de liberação do dinheiro conferido no painel do MP
- [ ] NFS-e de teste emitida e cancelada no ambiente de homologação do provedor
- [ ] Termos de Uso e Política de Privacidade com cláusulas de pagamento, renovação, cancelamento e reembolso (revisão jurídica)
- [ ] Alertas: webhooks `failed`, notas com erro, chargeback aberto

## 13. Decisões em aberto (o Vitor define; os agentes usam placeholders configuráveis)
1. Planos, preços e limites de cada um (contratos/mês, assentos).
2. Trial? Quantos dias? Pede cartão no trial?
3. Plano anual (com desconto)? Parcelamento no cartão para o anual?
4. Carência do dunning (padrão 7 dias).
5. Política de reembolso para CNPJ e reembolso proporcional no cancelamento.
6. Provedor de NFS-e; código de serviço, ISS e regime da GVF (com o contador).
7. Exigir CNPJ (só B2B) ou aceitar CPF (advogado autônomo)?
8. Provedor de e-mail transacional (ex.: Resend, Postmark, Zoho ZeptoMail).

---

### Prompt de início para o agente

> Você vai implementar o módulo de pagamentos da Ponderum seguindo o arquivo `docs/PAGAMENTOS_SPEC.md`. Leia o documento inteiro. Trabalhe **somente na Fase indicada** abaixo, faça commits pequenos, escreva os testes de cada tarefa e não chame o SDK/API do Mercado Pago fora de `providers/mercadopago.ts`. Use `PAYMENT_PROVIDER=mock`. Se encontrar uma decisão da seção 13, use um valor configurável e registre a suposição em `docs/billing-decisions.md`. Ao terminar a fase, rode todos os testes e liste o que foi entregue e o que ficou pendente.
> **Fase atual:** 0 — Diagnóstico. Já existe implementação parcial do fluxo de pagamento. Não escreva código nesta fase: mapeie o que existe, preencha a seção 0, gere `docs/billing-gap-report.md` e proponha a ordem ajustada das fases. Depois pare e aguarde aprovação.
>
> Contexto adicional do Vitor: _(descreva aqui o que já foi feito, ex.: "já criei a tabela de planos e a página de preços; comecei o checkout com cartão mas sem webhook")_
