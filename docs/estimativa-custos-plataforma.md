---
title: Estimativa de Custos da Plataforma — Teste e Produção
status: Rascunho para revisão do Kober
created_at: 2026-06-25
author: "@dev (Dex)"
audience: "Kober (sócio responsável pelo Financeiro)"
---

# Estimativa de Custos — SOJ

Kober — isto é uma estimativa técnica, não uma cotação fechada. Os valores de uso (quanto custa por contrato analisado, por exemplo) vêm direto do código real do produto; os preços das ferramentas vêm dos sites oficiais em 25/06/2026 e podem mudar.

## Resumo executivo

| Fase | Custo mensal estimado | Quando entra |
|---|---|---|
| **Hoje (desenvolvimento/teste)** | **R$ 0 – R$ 50** (~US$ 0–10) | Já estamos nessa fase |
| **Beta — 30 clientes** | **R$ 250 – R$ 700** (~US$ 50–140) | Quando abrirmos para os 30 clientes beta |
| **Produção — crescimento (ex: 200-500 clientes pagantes)** | **R$ 2.500 – R$ 12.000+** (~US$ 500–2.400+) | Escala com o número de clientes — a maior parte é custo de IA, que é variável e acompanha o uso real |

O ponto mais importante: **o maior custo variável é a API da Claude (IA), e ela escala linearmente com o uso** — cada contrato analisado custa centavos, não dezenas de reais. Isso é uma característica boa do modelo de negócio: o custo por análise é muito menor que o preço cobrado do cliente (planos de R$ 147–397/mês), então a margem se mantém conforme cresce.

---

## 1. Custo por contrato analisado (a unidade real de custo do produto)

Cada contrato passa por até 2 chamadas à API da Claude:

| Etapa | Modelo | Custo aproximado |
|---|---|---|
| Extração de texto + dados estruturados (`parse-contract`) | Claude Haiku 4.5 ($1/$5 por milhão de tokens) | ~R$ 0,25 – R$ 0,35 |
| Análise jurídica + score de risco (`analyze-contract`) | Claude Sonnet 4.6 ($3/$15 por milhão de tokens) | ~R$ 0,45 – R$ 0,65 |
| **Total por contrato** | | **~R$ 0,70 – R$ 1,00** |

(Faixa larga porque contratos variam de 2 a 50+ páginas — contratos maiores custam mais tokens.)

**Por que isso importa para o financeiro:** o plano Starter (R$ 147/mês, 5 contratos/mês) custa ~R$ 3,50–5,00 em IA por cliente/mês. O plano Pro (R$ 397/mês, contratos ilimitados) é onde a margem precisa ser monitorada se um cliente usar muito volume — vale ter um alerta de uso por organização (já temos rate limiting de 10 análises/hora implementado por segurança, mas não um limite de custo por plano).

---

## 2. Fase atual — Desenvolvimento e Teste

| Ferramenta | Plano | Custo | Por quê |
|---|---|---|---|
| **Supabase** | Free | R$ 0 | Suficiente para teste com poucos usuários. **Atenção:** projetos gratuitos pausam após 7 dias de inatividade — não é viável para qualquer uso real com usuários externos, só para nós mesmos testando |
| **Claude API (Anthropic)** | Pay-as-you-go | R$ 0–50 | Já configurada (`ANTHROPIC_API_KEY`). Custo só do que testarmos manualmente |
| **Resend** | Free | R$ 0 | 3.000 emails/mês, 100/dia — já configurada e testada, suficiente para teste |
| **Vercel** | Hobby (Free) | R$ 0 | 100GB de transferência/mês, 1M requisições — suficiente para deploy de teste. 1 desenvolvedor só (sem colaboração em equipe) |
| **GitHub** | Free | R$ 0 | Repositório já criado, plano gratuito cobre o necessário |
| **Domínio** | — | R$ 0 | Ainda não registrado (pendência conhecida — `RESEND_API_KEY` está usando o sandbox `onboarding@resend.dev` até termos um domínio verificado) |

**Total fase atual: ~R$ 0–50/mês**

---

## 3. Fase Beta — 30 clientes

Quando abrirmos para os 30 clientes beta de verdade, alguns planos free deixam de ser viáveis (principalmente o pause-after-7-days do Supabase, que mataria a experiência de qualquer cliente que não usa o produto toda semana).

| Ferramenta | Plano recomendado | Custo mensal | Por quê |
|---|---|---|---|
| **Supabase** | Pro | US$ 25 (~R$ 140) + uso | Pro inclui 8GB de banco, 100GB de storage, 100K usuários ativos — bem acima do que 30 clientes vão usar. Sem isso, o produto pausa sozinho |
| **Claude API** | Pay-as-you-go | ~R$ 100–300 | 30 clientes × ~5-15 contratos/mês (mistura de Starter/Pro) × ~R$ 0,70–1,00/contrato = ~150–450 contratos/mês |
| **Resend** | Free ou Pro | R$ 0–110 (US$ 0–20) | Free (3.000 emails/mês) provavelmente é suficiente para alertas de obrigações de 30 clientes. Pro (US$ 20/mês) só se o volume de alertas for maior que o esperado |
| **Vercel** | Hobby ou Pro | R$ 0–110 (US$ 0–20) | Hobby (free) provavelmente cobre 30 clientes beta; Pro (US$ 20/mês por assento) se precisar de colaboração em equipe (Vitor + Fellipe + Kober) ou mais volume de build |
| **Domínio (.com.br ou .com)** | — | ~R$ 40–100/ano (~R$ 3–8/mês) | Necessário para sair do sandbox do Resend e enviar email de verdade para os clientes — **bloqueador atual para alertas de obrigações funcionarem com usuários reais** |
| **GitHub** | Free | R$ 0 | Continua suficiente |

**Total fase beta: ~R$ 250 – R$ 700/mês** (dependendo de quanto os clientes usarem)

---

## 4. Fase Produção — Crescimento (exemplo: 200–500 clientes pagantes)

Aqui o custo escala principalmente com volume de contratos (IA) e armazenamento (Supabase). Os números abaixo são uma projeção de cenário, não uma previsão — dependem de quantos clientes realmente assinam e quanto usam.

| Ferramenta | Plano recomendado | Custo mensal estimado | Por quê |
|---|---|---|---|
| **Supabase** | Pro + uso, ou Team se precisar de compliance (SOC2/ISO) | R$ 200–800 (US$ 35–150) | Cresce com volume de dados/storage. Team (US$ 599/mês) só vale a pena se exigirmos SOC2/ISO 27001 para vender a clientes maiores |
| **Claude API** | Pay-as-you-go | **R$ 2.000–10.000+** (US$ 400–2.000+) | O maior custo, e o mais diretamente ligado à receita: 200-500 clientes × 5-20 contratos/mês × R$ 0,70–1,00 = 700-10.000 contratos/mês. Esse é o número que vale monitorar mês a mês |
| **Resend** | Pro ou Scale | R$ 110–900 (US$ 20–160) | Conforme o volume de alertas de obrigações crescer |
| **Vercel** | Pro | R$ 110/assento (US$ 20) + uso | 1TB de transferência incluso, US$ 20/mês de crédito de uso; escala com tráfego acima disso |
| **Domínio + SSL** | — | ~R$ 3–8/mês | SSL já incluso no Vercel automaticamente |
| **GitHub** | Free ou Team | R$ 0–190 | Free cobre times pequenos; Team (US$ 4/usuário/mês) só se precisarmos de mais controle de acesso |

**Total fase produção: ~R$ 2.500 – R$ 12.000+/mês**, variando principalmente com o volume de contratos processados pela IA.

---

## 5. Ferramentas que provavelmente vão ser necessárias, mas ainda não estão no orçamento

Essas não existem hoje no produto, mas são comuns nessa fase de crescimento — incluindo aqui para o planejamento financeiro não ser surpreendido depois:

| Ferramenta | Para quê | Quando | Custo típico |
|---|---|---|---|
| Monitoramento de erros (ex: Sentry) | Saber quando a aplicação quebra em produção, antes do cliente reclamar | Recomendado antes do beta abrir para usuários reais | Free tier geralmente cobre até várias centenas de clientes |
| Analytics de produto (ex: PostHog, Mixpanel) | Medir NPS e uso real (a meta documentada do projeto é "30 beta clientes, NPS > 40") | Beta ou logo depois | Free tier geralmente suficiente no início |
| Revisão jurídica externa (Fellipe + possível advogado terceirizado) | Validar Termos de Uso/Política de Privacidade antes de produção real (ver `docs/decisions/2026-06-24-pedido-revisao-juridica-lgpd.md`) | Antes de abrir o beta para clientes reais | Não é custo de SaaS, é horas de trabalho jurídico |
| Supabase: proteção HaveIBeenPwned para senhas | Achado de segurança real, exige plano Pro (já incluso na estimativa acima) | Já recomendado na auditoria de segurança | Incluso no Pro |

---

## Observações finais

1. **O número que mais importa monitorar mês a mês é o custo de Claude API por contrato processado.** Se esse número subir descontroladamente sem aumento proporcional de clientes pagantes, é sinal de abuso de uso ou contratos anormalmente grandes — o rate limiting de 10 análises/hora por organização (já implementado) ajuda a conter isso.
2. **Netlify vs. Vercel:** o projeto migrou de Netlify para Vercel em 10/07/2026 — os créditos gratuitos do Netlify se esgotaram e bloquearam novos deploys. O Vercel Free (Hobby) oferece uma cota de build bem maior (6.000 min/mês vs. 300 do Netlify), o que resolveu o bloqueio. O site em produção já está em `ponderum.vercel.app`.
3. Os valores em R$ usam uma cotação aproximada de US$ 1 = R$ 5,50 — ajustar conforme a cotação real no momento da decisão.

## Fontes (preços consultados em 25/06/2026)

- [Supabase Pricing](https://supabase.com/pricing)
- [Supabase Pricing 2026 — UI Bakery](https://uibakery.io/blog/supabase-pricing)
- [Resend Pricing](https://resend.com/pricing)
- [Resend Pricing — StackScored](https://www.stackscored.com/pricing/transactional-email/resend/)
- [Vercel Pricing](https://vercel.com/pricing) (consultado em 14/07/2026)
- Preços da API Claude (Sonnet 4.6, Haiku 4.5): documentação interna do modelo, valores oficiais Anthropic
