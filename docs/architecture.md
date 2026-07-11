# SOJ — Arquitetura do Sistema

> Documento vivo. Atualizar junto com o código. Tratar desatualização como bug.

---

## Visão Geral

O **SOJ (Sistema Operacional Jurídico)** é uma plataforma SaaS legal-tech que centraliza a gestão operacional de escritórios de advocacia e departamentos jurídicos. Permite gerenciar contratos, obrigações, análises de risco e geração de documentos em um único ambiente.

**Usuários-alvo:** Advogados, gestores jurídicos e equipes de compliance.

---

## Stack Tecnológica

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Frontend | React 18 + Vite 5 + TypeScript | Ecossistema maduro, tipagem forte, build rápido |
| Styling | Tailwind CSS v3 + shadcn/ui | Design system consistente sem overhead |
| State/Cache | TanStack Query v5 | Cache servidor-side, refetch automático |
| Routing | React Router v6 | Lazy loading nativo, nested routes |
| Auth | Supabase Auth | JWT, RLS integrada, zero servidor próprio |
| Database | Supabase Postgres | SQL completo, RLS, Realtime nativo |
| Storage | Supabase Storage | Bucket `contracts` para documentos e logos |
| Realtime | Supabase Realtime | Subscriptions em tabelas críticas |
| Deploy FE | Vercel | CI/CD automático, preview deploys |
| Deploy BE | Supabase Edge Functions | Deno, próximo ao banco, sem cold start crítico |

---

## Estrutura de Código (Bulletproof React)

```
src/
├── app/
│   └── App.tsx                    # Entrypoint + providers
├── components/
│   ├── layout/                    # Componentes estruturais
│   │   ├── AppLayout.tsx          # Shell principal autenticado
│   │   ├── AppSidebar.tsx         # Navegação lateral
│   │   ├── BottomNav.tsx          # Navegação mobile
│   │   ├── Charts.tsx             # Componentes de gráfico reutilizáveis
│   │   ├── OnboardingModal.tsx    # Modal de primeiro acesso
│   │   └── Primitives.tsx         # Blocos visuais base
│   └── ui/                        # shadcn/ui — NÃO editar manualmente
├── config/
│   └── env.ts                     # Variáveis de ambiente com validação runtime
├── data/
│   └── soj.ts                     # Mock data para Dashboard e Análise
├── features/
│   └── auth/
│       └── components/
│           ├── AuthProvider.tsx    # Context de autenticação
│           └── ProtectedRoute.tsx # Guard de rota autenticada
├── hooks/                         # Hooks de dados compartilhados
│   ├── useContracts.ts
│   ├── useObligations.ts
│   ├── useOrganization.ts
│   ├── useDashboard.ts
│   ├── useGeneratedContracts.ts
│   ├── useBillingHistory.ts
│   └── useOnboarding.ts
├── lib/
│   ├── supabase.ts                # Cliente Supabase singleton
│   ├── query-client.ts            # Configuração TanStack Query
│   ├── contractDocs.ts            # Geração de documentos DOCX
│   ├── receiptPdf.ts              # Geração de PDF
│   └── utils.ts                  # Utilitários gerais (cn, etc.)
├── pages/                         # Uma por rota, lazy-loaded
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   ├── Contracts.tsx
│   ├── Obligations.tsx
│   ├── Analysis.tsx
│   ├── Generator.tsx
│   ├── Settings.tsx
│   └── NotFound.tsx
└── types/
    └── database.types.ts          # Tipos gerados pelo Supabase CLI
```

---

## Módulos de Negócio

### Contratos (`/contracts`)
- CRUD completo de contratos
- Upload de arquivo (bucket `contracts`)
- Campos: título, partes, valor, datas, tipo, status, risco

### Obrigações (`/obligations`)
- Controle de obrigações vinculadas a contratos
- Alertas de vencimento
- Status: pending, completed, overdue

### Análise de Risco (`/analysis`)
- Análise de cláusulas via IA (Edge Function)
- Score de risco por contrato
- Histórico de análises

### Gerador de Documentos (`/generator`)
- Templates de contratos predefinidos
- Geração DOCX via biblioteca `docx`
- Download direto

### Dashboard (`/`)
- Métricas gerais (contratos ativos, obrigações pendentes, alertas)
- Gráficos via Recharts

### Configurações (`/settings`)
- Dados da organização
- Preferências do usuário

---

## Banco de Dados (Supabase Postgres)

### Tabelas Identificadas
| Tabela | Descrição |
|---|---|
| `profiles` | Dados do usuário (vinculado a auth.users) |
| `organizations` | Organizações/escritórios |
| `contracts` | Contratos cadastrados |
| `contract_obligations` | Obrigações vinculadas a contratos |
| `contract_analyses` | Análises de risco geradas |
| `generated_contracts` | Documentos gerados pelo sistema |

### Realtime Ativo
- `contracts`
- `contract_obligations`
- `generated_contracts`
- `contract_analyses`

---

## Segurança

- **RLS habilitado** em todas as tabelas expostas
- **Políticas por `auth.uid()`** — usuário acessa apenas dados da própria organização
- **JWT via Supabase Auth** — sessão gerenciada no cliente
- **Zod** para validação em fronteiras (formulários, inputs externos)
- **Variáveis de ambiente** tipadas via `src/config/env.ts`
- Sem `service_role` key no frontend

---

## Fluxo de Autenticação

```
Login → Supabase Auth → JWT → AuthProvider (Context)
                                    ↓
                            ProtectedRoute (guard)
                                    ↓
                            AppLayout + páginas
```

---

## ADR Template

Para registrar decisões de arquitetura, criar arquivo em `docs/decisions/ADR-NNN-titulo.md`:

```markdown
# ADR-NNN: Título da Decisão

**Data:** YYYY-MM-DD
**Status:** Proposed | Accepted | Deprecated

## Contexto
Por que essa decisão foi necessária?

## Decisão
O que foi decidido?

## Consequências
Quais os trade-offs e impactos?
```

---

## Migrations

Migrations em `supabase/migrations/` — uma por mudança estrutural no banco.

```bash
supabase migration new <nome-descritivo>  # criar nova migration
supabase db push                          # aplicar no projeto remoto
supabase db pull --local                  # gerar migration do estado atual
```
