# Ponderum — Fluxo de Cupom de Desconto

> **Para os agentes:** complemento do `docs/PAGAMENTOS_SPEC.md`. A integração com o Mercado Pago já está quase pronta. **Não refazer nada dela.** Este documento adiciona apenas o cupom. O cupom é **nosso** (validado e calculado no backend). O Mercado Pago recebe só o valor final já com desconto.
>
> **Nota de implementação (2026-11-14):** `discount_value` para `discount_type='percent'` está limitado a **1–99**, não 1–100. O caso de 100%/cortesia descrito na seção 2 (via `access_overrides`) foi adiado porque essa tabela não existe ainda (é escopo da Fase 3 do Manager, nunca criada) — retomar quando `access_overrides` for implementada.

## 1. Princípios

1. **O backend calcula o desconto.** O front só envia o código digitado. Nenhum valor com desconto vindo do front é aceito.
2. **Mercado Pago não conhece o cupom.** Ele recebe o `transaction_amount` já descontado (pagamento avulso/Pix) ou o `auto_recurring.transaction_amount` descontado (assinatura).
3. **Duração medida em ciclos de cobrança**, não em datas soltas. Ex.: "50% por 3 meses" = 3 cobranças com desconto.
4. **Volta automática ao valor cheio** controlada pelo nosso sistema, sem ação manual.
5. **Tudo idempotente e auditado**, como no restante do módulo.

## 2. Regras do cupom

| Campo | Descrição |
| --- | --- |
| `code` | Texto único, sem diferenciar maiúsculas (salvar em maiúsculas). Ex.: `LANCAMENTO50` |
| `discount_type` | `percent` ou `fixed` (valor em centavos) |
| `discount_value` | 1 a 100 para percentual; centavos para fixo |
| `duration` | `once` (só a 1ª cobrança), `repeating` (N ciclos) ou `forever` |
| `duration_cycles` | Obrigatório quando `repeating` |
| `valid_from` / `valid_until` | Janela em que o cupom **pode ser resgatado** (não confundir com a duração do desconto) |
| `max_redemptions` | Limite total de usos (opcional) |
| `max_per_organization` | Padrão 1 |
| `allowed_plans` | Planos em que vale (vazio = todos) |
| `new_customers_only` | Só para quem nunca teve assinatura paga |
| `allowed_methods` | `card`, `pix` ou ambos |
| `is_active` | Liga/desliga a promoção a qualquer momento |

Regras de cálculo:

- Valor final = preço do plano − desconto, **arredondado para baixo em centavos**, nunca abaixo de **R$ 1,00** (valor mínimo para cobrar). Desconto de 100% = tratar como cortesia (`access_overrides`), sem passar pelo Mercado Pago.
- **Um cupom por assinatura.** Não acumula.
- Desativar ou vencer o cupom **não afeta** quem já resgatou: o cliente mantém o desconto pelos ciclos contratados.

## 3. Modelo de dados

```sql
create table coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text,
  discount_type text not null check (discount_type in ('percent','fixed')),
  discount_value integer not null check (discount_value > 0),
  duration text not null check (duration in ('once','repeating','forever')),
  duration_cycles integer check (duration_cycles > 0),
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  max_redemptions integer,
  max_per_organization integer not null default 1,
  allowed_plans text[] not null default '{}',
  allowed_methods text[] not null default '{card,pix}',
  new_customers_only boolean not null default false,
  is_active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  check (duration <> 'repeating' or duration_cycles is not null)
);

create table coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references coupons(id),
  organization_id uuid not null references organizations(id),
  subscription_id uuid not null unique references subscriptions(id), -- 1 cupom por assinatura
  discount_snapshot jsonb not null,      -- regras congeladas no momento do resgate
  full_amount_cents integer not null,     -- preço cheio do plano no resgate
  discounted_amount_cents integer not null,
  cycles_total integer,                   -- null = forever
  cycles_used integer not null default 0,
  status text not null default 'active' check (status in ('active','completed','canceled')),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- nos pagamentos, registrar o que foi aplicado
alter table payments add column coupon_redemption_id uuid references coupon_redemptions(id);
alter table payments add column discount_cents integer not null default 0;
```

O `discount_snapshot` garante que, se alguém editar o cupom depois, o cliente continua com as regras que aceitou.

## 4. Jornada do cliente

1. No checkout, abaixo do resumo do plano: link **"Tenho um cupom"**, que abre um campo e o botão **Aplicar**.
2. Front chama `POST billing-api/coupons/validate` com `{ code, planCode, method }`.
3. Backend valida e devolve: válido ou motivo, valor cheio, desconto, valor final e o texto pronto da regra. Ex.: *"50% de desconto nas 3 primeiras mensalidades. A partir da 4ª: R$ 297,00/mês."*
4. O resumo mostra: preço cheio riscado, desconto, valor de hoje e quando passa a cobrar o valor cheio (com data prevista).
5. Cliente pode remover o cupom antes de pagar.
6. Ao pagar, o front envia só o `code` junto com o checkout. O backend **valida de novo** dentro da mesma transação que cria a assinatura (evita corrida no limite de usos) e grava o `coupon_redemptions`.
7. O e-mail de confirmação e a tela "Minha assinatura" mostram o desconto e a data em que volta ao valor cheio.

Mensagens de erro (curtas e neutras): cupom inválido · cupom expirado · cupom não vale para este plano · cupom já utilizado · cupom esgotado · válido só para novos clientes.

## 5. Como a duração é aplicada

### Assinatura no cartão (preapproval do Mercado Pago)

- Criar o `preapproval` com `auto_recurring.transaction_amount` = **valor com desconto**.
- A cada pagamento **aprovado** da assinatura (no processador do webhook, de forma idempotente por `payment_id`): `cycles_used = cycles_used + 1` e gravar `discount_cents` no pagamento.
- Quando `cycles_used = cycles_total`: chamar `PUT /preapproval/{id}` alterando `auto_recurring.transaction_amount` para `full_amount_cents`, marcar o resgate como `completed` e enviar e-mail avisando que a próxima cobrança será no valor cheio.
- `once` = `cycles_total` 1 (volta ao cheio logo após a 1ª cobrança). `forever` = nunca altera o valor.
- **Rede de segurança:** job diário `coupon-sync` procura resgates com ciclos esgotados e assinatura ainda com valor descontado no Mercado Pago (consulta o `preapproval`) e corrige. Também alerta no manager se a correção falhar.
- Cobrança recusada **não consome ciclo**; só pagamento aprovado conta.
- Troca de plano durante o desconto: v1 encerra o cupom (`canceled`) e passa a cobrar o preço cheio do novo plano. Registrar no audit log.

### Pix (renovação feita pelo nosso sistema)

- O job `generate-pix-renewals` calcula o valor de cada cobrança: se o resgate está `active` e `cycles_used < cycles_total` (ou `forever`), aplica o desconto; senão, valor cheio.
- O consumo de ciclo acontece quando o Pix é **aprovado**, igual ao cartão.

### Cancelamento e reativação

- Cancelou: resgate vira `canceled`. Reassinar depois **não** devolve o cupom (salvo cupom novo e permitido).
- Estorno pelo direito de arrependimento: o uso do cupom volta a ser contado como não utilizado no limite total (`max_redemptions`).

## 6. Endpoints

| Endpoint | Função |
| --- | --- |
| `POST billing-api/coupons/validate` | Prévia do desconto (não reserva o cupom). Rate limit: 10 tentativas por usuário a cada 10 min, contra adivinhação de códigos |
| Checkout existente (cartão e Pix) | Aceita campo opcional `couponCode`; revalida e aplica |
| `manager-billing` (portal manager) | Criar, editar, desativar cupons; ver resgates |

## 7. Portal manager — Área Financeiro › Cupons

A tela de cupons fica dentro da Área Financeiro. Só os perfis `financeiro` e `owner` criam, editam e desativam cupons. A `equipe` apenas consulta a lista e os resgates para atender clientes; `dev` não acessa. A permissão é validada na Edge Function `manager-billing` e na RLS da tabela `coupons`, não só no front.

- Lista: código, regra em texto, validade, usos / limite, status, receita gerada e desconto total concedido.
- Criar/editar com prévia da regra em texto e simulação ("no plano X o cliente paga R$ … por N meses e depois R$ …").
- Detalhe: lista de organizações que usaram, ciclos restantes de cada uma.
- Edição de cupom já resgatado só altera campos de resgate futuro (validade, limite, ativo). Desconto e duração ficam bloqueados; para mudar, criar outro cupom.
- Toda alteração gravada em `staff_audit_log`.

## 7.1 Dashboard financeiro: GMV e NMV (PENDENTE de validação com o responsável financeiro)

As definições abaixo são a proposta inicial. Os agentes implementam já, mas com as regras de cálculo **centralizadas em uma única view/função** (`finance_metrics`) e rotuladas no painel como "definição provisória", para ajustar depois sem mexer nas telas.

| Indicador | Cálculo proposto | Fonte |
| --- | --- | --- |
| **GMV** | Soma do preço cheio de tabela de todas as cobranças aprovadas no período, antes de qualquer desconto | `payments.amount_cents + payments.discount_cents` (aprovados) |
| (−) Descontos de cupom | Soma dos descontos concedidos | `payments.discount_cents` |
| (−) Estornos | Valores devolvidos no período | `payments` com status `refunded` / `partially_refunded` |
| (−) Chargebacks | Valores perdidos em contestação | `chargebacks` com status `lost` |
| **NMV** | GMV − cupons − estornos − chargebacks | calculado |
| (−) Taxas do gateway | Taxas do Mercado Pago | `payments.fee_cents` |
| **Receita líquida em caixa** | NMV − taxas | calculado |

No painel:

- Cascata (waterfall) do mês: GMV → cupons → estornos → chargebacks → NMV → taxas → líquido.
- Cards de GMV e NMV com comparação ao mês anterior e percentual de desconto sobre o GMV.
- Evolução mensal (12 meses) de GMV × NMV.
- Quebra por plano, por método (cartão/Pix) e por cupom (quanto cada promoção custou em desconto e quanto gerou de NMV).
- Filtro de período e exportação CSV.

Pontos a confirmar com o financeiro:

- [ ] Regime: competência (data da venda) ou caixa (data de liberação do dinheiro)?
- [ ] Estornos e chargebacks contam no mês da venda original ou no mês em que aconteceram?
- [ ] Cortesias (100% de desconto, sem cobrança) entram no GMV pelo valor de tabela?
- [ ] Impostos (ISS da nota fiscal) devem ser descontados para chegar ao valor final?
- [ ] As taxas entram no NMV ou só na receita líquida (como proposto)?

## 8. Testes obrigatórios

- Validação: inexistente, expirado, inativo, plano errado, método errado, limite total, limite por organização, só novos clientes.
- Valor nunca abaixo de R$ 1,00; percentual e fixo; arredondamento.
- `repeating 3`: 3 pagamentos aprovados com desconto e o `PUT /preapproval` disparado **uma única vez** após o 3º, mesmo com webhook duplicado.
- Recusa no meio do período não consome ciclo.
- Pix: renovação com e sem desconto conforme ciclos.
- Dois checkouts simultâneos com o último uso disponível: só um consegue.
- Valor manipulado no front é ignorado.
