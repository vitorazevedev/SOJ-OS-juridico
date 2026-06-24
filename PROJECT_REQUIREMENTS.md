# SOJ — Project Requirements

> Documento vivo. Atualizar quando requisitos mudam. Tratar desatualização como bug.
> Última atualização: 2026-06-12 — dados do documento estratégico incorporados.

---

## Identidade do Sistema

**Nome:** SOJ — Sistema Operacional Jurídico
**Categoria:** SaaS Legal-Tech B2B
**Missão:** Transformar a gestão jurídica de PMEs com IA — da análise de risco com impacto financeiro em R$ até a geração de contratos profissionais.
**Diferencial central:** Único sistema que traduz risco jurídico em impacto financeiro real: "esta cláusula pode custar até R$ 280.000 à sua empresa."
**Motor de IA:** Claude API (Anthropic) — Sonnet para análise jurídica, Haiku para parsing e classificação

---

## Stack Técnica

| Componente | Tecnologia |
|---|---|
| Frontend | React 18 + Vite 5 + TypeScript (strict) |
| Styling | Tailwind CSS v3 + shadcn/ui |
| State/Cache | TanStack Query v5 |
| Routing | React Router v6 |
| Backend | Supabase (Auth, Postgres, Storage, Realtime) |
| Deploy | Netlify (FE) + Supabase Edge Functions (BE) |
| IA | Claude API — Sonnet 4.5 (análise), Haiku 4.5 (parsing) |

---

## Segmentos-Alvo

| Segmento | Perfil | Dor Principal |
|---|---|---|
| PMEs (10-200 funcionários) | Empresas com contratos regulares mas sem jurídico interno | Contratos arriscados assinados sem análise |
| Startups SaaS | Alto volume de contratos (clientes, fornecedores, parceiros) | Velocidade x segurança jurídica |
| Escritórios de advocacia (Fase 2) | Pequenos e médios escritórios | Eficiência operacional + entrega de valor ao cliente |
| Departamentos jurídicos PMEs (Fase 2) | Empresas com 1-3 advogados internos | Centralização e automação de tarefas repetitivas |

---

## Papéis de Usuário

| Papel | Descrição | Permissões |
|---|---|---|
| Administrador | Dono/gestor da organização | CRUD completo, configurações, membros, billing |
| Usuário Operacional | Advogado/analista da equipe | CRUD de contratos e obrigações, leitura de análises |

---

## Planos e Pricing

| Plano | Preço/mês | Contratos/mês | Usuários | Alvo |
|---|---|---|---|---|
| Starter | R$ 147 | 5 | 1 | Freelancers, MEI |
| Pro | R$ 397 | 20 | 3 | PMEs pequenas |
| Business | R$ 997 | 60 | 10 | PMEs médias |
| Firm | R$ 1.497 | 150 | 25 | Escritórios de advocacia |
| Enterprise | Sob consulta | Ilimitado | Ilimitado | Grandes corporações |

---

## Os 19 Módulos do SOJ (4 Camadas)

### Camada 1 — Entrada de Dados

| # | Módulo | MVP | Prioridade |
|---|---|---|---|
| 1 | Upload e Parsing (PDF/DOCX/imagens + OCR) | Sim | Crítica |
| 2 | Integração com sistemas externos (e-CAC, tribunais) | Não | Fase 3 |
| 3 | Importação em lote (ZIP, Drive, OneDrive) | Não | Fase 2 |

### Camada 2 — Análise e IA

| # | Módulo | MVP | Prioridade |
|---|---|---|---|
| 4 | Análise Jurídica com IA (50+ tipos de cláusula) | Sim | Crítica |
| 5 | Análise de Impacto Financeiro (R$) | Sim | Crítica (diferencial) |
| 6 | Análise de Conformidade (CC/2002, CLT, LGPD) | Parcial no MVP | Alta |
| 7 | Comparação entre versões de contratos | Não | Fase 2 |
| 8 | Sugestão de redação alternativa IA | Não | Fase 2 |

### Camada 3 — Geração Inteligente

| # | Módulo | MVP | Prioridade |
|---|---|---|---|
| 9 | Gerador de Contratos (5 templates) | Sim | Alta |
| 10 | Export PDF/DOCX | Sim | Alta |
| 11 | Assinatura Digital (DocuSign/ZapSign) | Não | Fase 2 |
| 12 | Templates customizados pelo usuário | Não | Fase 2 |

### Camada 4 — Gestão Ativa

| # | Módulo | MVP | Prioridade |
|---|---|---|---|
| 13 | Central de Obrigações com alertas email | Sim (parcial) | Alta |
| 14 | Alertas WhatsApp/SMS | Não | Fase 2 |
| 15 | Integração Google Calendar / Outlook | Não | Fase 2 |
| 16 | Dashboard com KPIs de exposição financeira | Sim | Alta |
| 17 | Relatórios executivos (PDF) | Não | Fase 2 |
| 18 | Workflow de aprovação de contratos | Não | Fase 2 |
| 19 | Auditoria e rastreabilidade | Não | Fase 2 |

---

## Fases do Produto

### Fase 1 — MVP (Meses 1-3)
**Objetivo:** 30 beta clientes, NPS > 40

| Story | Módulo | Status |
|---|---|---|
| STORY-001 | Setup Trivia + Supabase | Done |
| STORY-002 | Upload e Parsing de Contratos | Backlog |
| STORY-003 | Análise Jurídica com IA (Claude API) | Backlog |
| STORY-004 | Análise de Impacto Financeiro (R$) | Backlog |
| STORY-005 | Central de Obrigações básica | Backlog |
| STORY-006 | Geração de Contratos (5 templates) | Backlog |

**Critérios de saída da Fase 1:**
- Upload + análise jurídica + impacto financeiro funcionando end-to-end
- Gerador de contratos com 5 templates
- Alertas de obrigações por email
- Dashboard com dados reais (sem mocks)
- 30 beta clientes ativos

### Fase 2 — Expansão (Meses 4-8)
**Objetivo:** 200 clientes pagantes, receita R$ 80k MRR

- Comparação de versões de contratos
- Assinatura digital (ZapSign BR)
- Alertas WhatsApp (via Twilio ou Z-API)
- Módulo para escritórios de advocacia
- Relatórios executivos em PDF
- Importação em lote

### Fase 3 — Escala (Meses 9-18)
**Objetivo:** 1.000+ clientes, marketplace de templates

- Integração com sistemas externos (e-CAC, JUCERJA, CNJ)
- Marketplace de templates jurídicos
- API pública para integrações
- Módulo enterprise (SSO, auditoria avançada, contratos ilimitados)

---

## Regras de Negócio

1. Todo usuário pertence a exatamente uma organização
2. Contratos são isolados por organização (RLS obrigatório)
3. Obrigações são sempre vinculadas a um contrato
4. Análises de risco são imutáveis após geradas (histórico preservado)
5. Impacto financeiro é sempre exibido como estimativa com disclaimer legal
6. Documentos gerados ficam disponíveis por 90 dias no Storage
7. Níveis de risco: `critical` > `high` > `medium` > `low`
8. Índices econômicos (SELIC, IPCA, INPC) são atualizados diariamente via cron
9. Claude API key NUNCA exposta no frontend — exclusivamente via Supabase Secrets
10. Limite de análises por plano (ver tabela de pricing acima)

---

## Restrições Técnicas

- Sem pacotes específicos da Lovable
- Importações apenas de `@/lib/supabase` (nunca de `@/integrations/supabase/*`)
- Variáveis de ambiente via `@/config/env` (nunca `import.meta.env` diretamente)
- Componentes máx 300 linhas
- Features não importam umas das outras (Bulletproof React)
- Validação de inputs com Zod nos formulários (segurança — SD-002)
- RLS habilitado em todas as tabelas expostas ao Data API

---

## Integrações Externas

| Serviço | Finalidade | Fase |
|---|---|---|
| Claude API (Anthropic) | Análise jurídica, parsing, geração | MVP |
| API Banco Central | Índices SELIC | MVP |
| API IBGE SIDRA | Índices IPCA, INPC | MVP |
| ZapSign ou DocuSign | Assinatura digital | Fase 2 |
| Z-API ou Twilio | Alertas WhatsApp | Fase 2 |
| Google Calendar | Sincronização de prazos | Fase 2 |

---

## Perguntas Respondidas (do documento estratégico)

- [x] Qual LLM? → Claude API (Sonnet para análise, Haiku para parsing)
- [x] Pricing? → R$ 147/397/997/1.497/Enterprise
- [x] Templates MVP? → 5: Prestação de Serviços, NDA, SaaS, Parceria, Fornecimento
- [x] Segmento principal? → PMEs 10-200 funcionários sem jurídico interno
- [x] Diferencial? → Impacto financeiro em R$ por cláusula

## Perguntas em Aberto

- [ ] Integração com e-CAC e sistemas de tribunais — escopo e viabilidade técnica para Fase 3
- [ ] Parceiros de revisão jurídica para validar templates (advogados consultores)
- [ ] Política de retenção de dados dos contratos analisados (privacidade / LGPD)
- [ ] Limite de tokens por análise para controle de custo Claude API
