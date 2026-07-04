# Ponderum — Status do MVP
**Reunião de sócios · 05 de julho de 2026**
*Preparado por: Vitor (Dev) · Para: Fellipe (Jurídico) e Kober (Financeiro)*

---

## 1. O que é o Ponderum

Plataforma SaaS de inteligência contratual. O usuário envia um contrato (PDF, Word ou imagem escaneada), a IA extrai o conteúdo, identifica cláusulas de risco com evidência direta no texto original, sugere mitigações e organiza prazos e obrigações. A palavra final é sempre do advogado ou do empresário — o Ponderum organiza a informação, não decide por ela.

**Diferencial principal:** cada cláusula de risco está ligada ao trecho literal do documento de onde veio. Sem invenção.

---

## 2. O que está funcionando no MVP

### Autenticação e segurança de acesso
- Cadastro por email/senha e por **Google (OAuth)** — configurado e testado em 03/07/2026
- Recuperação de senha por link
- Confirmação de aceite de Termos de Uso e Política de Privacidade obrigatória no cadastro
- Sessões com expiração automática (JWT via Supabase GoTrue)

> **Nota sobre Google OAuth:** funciona para qualquer conta Google. Após a definição do domínio (`ponderum.com.br`), serão necessários 4 ajustes simples: (1) atualizar Site URL no Supabase Auth, (2) adicionar o domínio nas Redirect URLs do Supabase, (3) adicionar o domínio nas origens autorizadas do Google Cloud Console e (4) configurar RESEND com o domínio próprio.

### Análise de contratos
| O que faz | Como faz |
|---|---|
| Upload de arquivo | PDF (32 MB), Word/DOCX (50 MB), imagem escaneada JPG/PNG (5 MB) |
| Extração de texto | Claude Haiku 4.5 — lê o documento e extrai o conteúdo bruto |
| Identificação de risco | Claude Sonnet 4.6 — analisa e pontua cada cláusula (0–100) |
| Destaque no texto | Cláusulas de risco aparecem sublinhadas no texto original |
| Impacto financeiro | Estimativa de exposição em R$ por cláusula (mín/máx/provável) |
| Sugestões | Redação alternativa menos arriscada para cada cláusula |
| Exportar PDF | Relatório completo com score, resumo, cláusulas e sugestões |

### Gestão contratual
- Lista de contratos com filtros (analisado, em análise, aguardando)
- Busca global por contrato ou obrigação
- Histórico completo de análises
- Renomear e excluir contratos

### Obrigações
- Cadastro manual de prazos, penalidades e recorrências
- Alertas de vencimento (até 7 dias, vencido, etc.)
- Filtro por tipo e status
- Notificações por email (via Resend — aguardando domínio próprio)

### Gerador de contratos
- 5 templates: Prestação de Serviços, NDA, Parceria, SaaS, Locação
- Campos com validação de CNPJ/CPF
- Exportação em PDF e Word
- Aviso legal explícito de que é modelo e não substitui advogado

### Configurações da organização
- Logo da empresa (upload)
- Membros da equipe com perfis
- Notificações de vencimento
- Informações da empresa (CNPJ, setor)

### LGPD — Direito do titular
- Exportação completa dos dados em JSON (portabilidade — Art. 18)
- Exportação em PDF legível (para quem não é técnico)
- Exclusão de conta com apagamento completo (contratos, análises, arquivos, usuário)
- Política de retenção automática (flag após 24 meses de inatividade)

### Landing page e captação
- Página pública com apresentação do produto
- Formulário de acesso antecipado (nome, email, WhatsApp, empresa, perfil)
- Os dados vão direto ao painel Dev interno

### Painel do desenvolvedor (`/admin`)
- Visível apenas para Vitor (role = admin)
- Mostra: organizações ativas, contratos/mês, análises/mês, feedbacks, waitlist
- Custo estimado do mês em R$ (calculado automaticamente)
- Feed de atividade em tempo real
- Saúde das funções agendadas (cron)
- Link direto para erros no Sentry

### Coleta de feedback
- Botão flutuante em todas as páginas (Sugestão / Erro / Omissão)
- Prompt automático após 45 segundos numa análise completa: *"As cláusulas identificadas fazem sentido para você?"*

---

## 3. Segurança — O que foi implementado

| Medida | Status | Detalhe |
|---|---|---|
| Row Level Security (RLS) | ✅ Auditado | Todas as 20 tabelas — isolamento total entre organizações confirmado |
| Autenticação JWT | ✅ | Supabase GoTrue — padrão da indústria |
| Login com Google (OAuth) | ✅ Configurado | Google Cloud Console + Supabase — testado em 03/07/2026 |
| Validação de entrada (Zod) | ✅ Completo | Generator, Obrigações, Login/Cadastro e Configurações — todos os formulários críticos |
| Rate limiting no login | ✅ | 5 tentativas por 5 min por IP (configurado no Supabase) |
| Headers HTTP | ✅ | CSP, HSTS, X-Frame-Options, Permissions-Policy (Netlify) |
| Anti-prompt injection | ✅ | System prompt hardened + conteúdo do contrato isolado em tags XML |
| Validação de arquivos | ✅ | Magic bytes — impede renomear um executável para .pdf |
| Dependências | ✅ | 7/9 vulnerabilidades npm corrigidas; 2 restantes são dev-only (sem risco em produção) |
| Monitoramento de erros | ✅ | Sentry configurado (captura automática em produção) |
| Audit log | ✅ | Registro automático de todas as criações e exclusões de contratos |
| LGPD | ✅ | Exportação, exclusão, consentimento, retenção |

---

## 4. Custos de plataforma

### Fase atual: testes com amigos (até ~50 contratos/mês)

| Serviço | Função | Custo atual |
|---|---|---|
| **Supabase** | Banco de dados, autenticação, armazenamento, funções | **R$ 0** (plano Free) |
| **Netlify** | Hospedagem do frontend | **R$ 0** (plano Free) ⚠️ créditos esgotados — novos deploys bloqueados até renovar ou fazer upgrade |
| **Sentry** | Monitoramento de erros | **R$ 0** (5k eventos/mês grátis) |
| **Resend** | Envio de emails automáticos do sistema (transacional) | **R$ 0** (3k emails/mês grátis) |
| **Google Fonts** | Tipografia Cormorant Garamond + Inter | **R$ 0** |
| **Claude API (Anthropic)** | IA para parse + análise | **~R$ 0,50–1,00 por contrato** |

**Custo total da fase de testes:** apenas o consumo da Claude API conforme os contratos analisados.
*Exemplo: 30 contratos no mês = R$ 15–30.*

### Domínio — investimento anual (único custo fixo imediato)

| Domínio | Onde comprar | Custo/ano | Recomendação |
|---|---|---|---|
| `ponderum.com.br` | registro.br | **R$ 40** (1 ano) / R$ 76 (2 anos) / R$ 184 (5 anos) | Prioritário — registrador oficial, sem intermediários |
| `ponderum.com` | Squarespace Domains | **~R$ 67–96** | Opcional — protege a marca globalmente |
| **Total (os dois)** | | **~R$ 107–136/ano** | |

> **Nota:** o `.com.br` é suficiente para o lançamento. O `.com` pode ser comprado depois para proteger a marca.

### Email com domínio próprio — opções

O Resend (já integrado) é exclusivamente transacional — envia alertas automáticos do sistema, mas **não serve como caixa de entrada** (não dá para receber emails). Para ter `vitor@ponderum.com.br`, `kober@ponderum.com.br` e `fellipe@ponderum.com.br` é necessário um serviço separado:

| Opção | Custo | Indicado para |
|---|---|---|
| **Zoho Mail** | **R$ 0** (até 5 usuários) | Fase atual — cobre Vitor, Kober e Fellipe sem custo |
| **Google Workspace** | ~R$ 34/usuário/mês (~R$ 102/mês para 3) | Quando o time crescer — Gmail, Drive, Meet integrados |

**Recomendação para agora:** Zoho Mail gratuito. Os 3 sócios já ficam com emails `@ponderum.com.br` sem custo. Quando o produto escalar, migra para Google Workspace mantendo os endereços.

### Quando escalar: fase Beta/Produção

| Volume | Supabase | Claude API (estimado) | Total/mês |
|---|---|---|---|
| Beta (50–200 contratos) | R$ 0 (Free) | R$ 25–100 | **~R$ 50–150** |
| Produção pequena (200–500) | R$ 143 (Pro $25) | R$ 100–250 | **~R$ 250–450** |
| Produção média (500–2.000) | R$ 143 (Pro) | R$ 250–1.000 | **~R$ 500–1.200** |

> Referência completa com todas as integrações: `docs/estimativa-custos-plataforma.md`

---

## 5. Pendências de decisão — precisam de resposta dos sócios

Estas questões **bloqueiam o lançamento público** ou afetam o produto diretamente:

| # | Pendência | Responsável | Impacto |
|---|---|---|---|
| 1 | **Domínio** `ponderum.com.br` — disponível em registro.br por R$ 40/ano. Decisão: registrar 1 ou 2 anos? Comprar o `.com` também (~R$ 67/ano na Squarespace)? | Kober / Vitor | Landing page, email oficial e Google OAuth em produção |
| 0 | **Netlify — upgrade para Pro (~R$ 100/mês)** — créditos gratuitos esgotados. O site atual continua no ar, mas novos deploys estão bloqueados. Opções: (a) esperar renovação mensal dos créditos gratuitos; (b) migrar para Vercel Free (6.000 min/mês vs 300 do Netlify); (c) fazer upgrade para Netlify Pro antes do lançamento. | **Kober** | Bloqueia lançamento para primeiros usuários se não resolvido |
| 2 | **Email oficial** — recomendação: Zoho Mail gratuito para Vitor, Kober e Fellipe (`@ponderum.com.br`). Precisa do domínio registrado primeiro. | Vitor (configurar) | Comunicação com usuários e suporte |
| 3 | **WhatsApp de suporte** — qual número? | Kober | Contato com usuários da waitlist |
| 4 | **Termos de Uso e Política de Privacidade** — revisão e aprovação | **Fellipe** | Obrigatório para lançamento público (LGPD) |
| 5 | **Prazo de retenção de dados** — quanto tempo guardar contratos inativos? | **Fellipe** | Hoje: sinaliza após 24 meses (sem excluir) |
| 6 | **Arte vetorial do símbolo** (SVG) | **Fellipe** | Sidebar e landing page têm "P" placeholder |
| 7 | **Tagline e descrição curta** — aprovação formal | **Fellipe** | Brand Guidelines marcados como "pendente" |
| 8 | **Clearance de marca** (INPI) | Fellipe | Lançamento público com nome Ponderum |
| 9 | **Modelo de precificação** — valores dos planos Starter/Pro | Vitor + Kober | Hoje só Starter (5 contratos/mês) existe |

---

## 6. Pendências técnicas — o que falta antes do lançamento público

Estas são tarefas de desenvolvimento, não precisam de decisão dos sócios — mas algumas dependem de informações externas:

| # | Tarefa | Depende de | Esforço |
|---|---|---|---|
| 1 | Configurar RESEND com domínio próprio | Domínio (#1 acima) | 1h após domínio |
| 2 | Configurar email oficial nas funções de alerta | Email (#2 acima) | 30 min |
| 3 | Substituir "P" placeholder pelo SVG real na sidebar e landing | SVG do Fellipe | 30 min |
| 4 | Publicar landing page (ativar deploy no Netlify) | Aprovações do Fellipe | 15 min |
| 5 | Configurar canal de suporte no painel Dev | WhatsApp/email (#2 e #3) | 1h |
| 6 | ~~Zod validation em todos os formulários~~ | — | ✅ Concluído |
| **Netlify** — resolver créditos esgotados antes de publicar qualquer atualização | Decisão do Kober (seção 5) | 15 min (upgrade ou migração) |
| 7 | Continuar extração de componentes (Settings 773 linhas, Generator 716 linhas) | — | 4–6h |
| 8 | Atualizar Vite para v6 (corrigir 2 vulnerabilidades dev restantes) | — | 2h + teste |
| 9 | Testes automatizados mínimos (fluxo de upload + análise) | — | 6–8h |

**Estimativa total de desenvolvimento restante:** ~20–25h concentradas em itens de qualidade e ajustes finais. O núcleo do produto está funcional.

---

## 7. O que o usuário consegue fazer hoje

Fluxo completo testado e funcionando:

1. Criar conta por email/senha **ou Google** com aceite de Termos ✅
2. Fazer upload de um contrato (PDF, Word, imagem) ✅
3. Aguardar extração automática de texto ✅
4. Solicitar análise de risco com IA ✅
5. Ver score, cláusulas destacadas e sugestões ✅
6. Exportar PDF do relatório ✅
7. Cadastrar obrigações e prazos ✅
8. Gerar um contrato modelo ✅
9. Exportar os próprios dados (LGPD) ✅
10. Excluir conta completamente ✅

---

## 8. O que muda quando tiver o domínio (`ponderum.com.br`)

Assim que o domínio estiver registrado e apontado para o Netlify, são **4 ajustes técnicos** — estimativa total de 2h:

| # | Onde | O que fazer | Esforço |
|---|---|---|---|
| 1 | Supabase → Auth → URL Configuration | Trocar Site URL para `https://ponderum.com.br` e adicionar nas Redirect URLs | 5 min |
| 2 | Google Cloud Console → Cliente Ponderum | Adicionar `https://ponderum.com.br` nas origens JavaScript autorizadas | 5 min |
| 3 | Resend | Verificar o domínio e atualizar o remetente de `onboarding@resend.dev` para `alertas@ponderum.com.br` | 30 min |
| 4 | Código (Edge Function) | Atualizar o `from:` nos emails de alerta de obrigações | 30 min + redeploy |

Após esses 4 passos: login com Google, emails de alerta e landing page funcionam todos com identidade Ponderum.

---

## 9. O que vem depois do MVP

Funcionalidades já mapeadas para fases futuras:

- **Comparação de versões** de contrato (antes/depois de renegociação)
- **Assinatura digital** integrada (ex: D4Sign)
- **Colaboração** — compartilhar análise com o time jurídico com comentários
- **Integração e-CAC** (tribunais e sistemas públicos — Fase 3, alta complexidade)
- **App mobile** (React Native)
- **Personalização da IA** pelo advogado (definir quais leis e precedentes usar)

---

*Documento gerado em 03/07/2026 · Atualizado em 03/07/2026 (Google OAuth configurado e testado)*
*Vitor Azevedo (Dev) · Próxima revisão: após reunião de sábado*
