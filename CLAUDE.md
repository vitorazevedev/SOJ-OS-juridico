# SOJ — Sistema Operacional Jurídico

## Stack
- React 18 + TypeScript (strict)
- Vite 5
- Tailwind CSS v3 + shadcn/ui
- Supabase (Auth, Postgres, Storage, Realtime) — projeto: `igolxkyahbavripvfeak`
- React Router v6 (lazy-loaded pages)
- TanStack Query v5
- Vercel (deploy)
- **Framework AIOX:** Triviaiox instalado em `.triviaiox-core/` e `.claude/`

## Project structure (Bulletproof React)
```
src/
  app/           # App.tsx entrypoint + providers
  components/
    layout/      # AppLayout, AppSidebar, BottomNav, OnboardingModal, Primitives, Charts
    ui/          # shadcn/ui components (do not edit manually)
  config/        # env.ts — typed env vars with runtime validation
  data/          # soj.ts — static mock data for Dashboard/Analysis
  features/
    auth/
      components/  # AuthProvider, ProtectedRoute
  hooks/         # Shared hooks (useContracts, useObligations, useOrganization, etc.)
  lib/           # supabase.ts, query-client.ts, contractDocs.ts, receiptPdf.ts, utils.ts
  pages/         # One file per route
  types/         # database.types.ts — Supabase DB schema
  index.css      # Design tokens (CSS variables) + base styles
  main.tsx       # React entry
```

## Supabase
- Project URL: configured in VITE_SUPABASE_URL
- Anon key: configured in VITE_SUPABASE_ANON_KEY
- **Projeto ativo:** `igolxkyahbavripvfeak` (sa-east-1)
- Storage bucket: `contracts` (contracts + logos + generated docs)
- Realtime: enabled on contracts, contract_obligations, generated_contracts, contract_analyses

## Design system
- Dark legal-tech UI — all colors are HSL CSS variables
- Primary: `hsl(var(--primary))` — green #00e5a0
- Risk levels: `--risk-critical`, `--risk-high`, `--risk-medium`, `--risk-low`
- Tailwind custom colors: `primary-dim`, `risk-*`, `info`, `sidebar-*`

## Key conventions
- Never import from `@/integrations/supabase/*` — use `@/lib/supabase`
- Never use Lovable-specific packages
- Layout components live in `@/components/layout/`, not `@/components/soj/`
- Auth hook: `useAuth()` from `@/features/auth/components/AuthProvider`
- Env vars: always import from `@/config/env` not `import.meta.env` directly
- Components: max 300 lines
- Features don't import from each other

## Regras invioláveis (Padrão Trivia)
1. **Documentação é código** — story aprovada antes de qualquer código
2. **Segurança não é opcional** — RLS, Zod, JWT. Sem atalhos
3. **Mudanças mínimas** — implementar exatamente o que foi pedido. Sem extras

## Agentes AIOX disponíveis
Invocar com `@nome` — ex: `@dev *develop`, `@sm *create-story`, `@qa *review`

| Agente | Papel |
|---|---|
| `@triviaiox-master` | Orquestrador |
| `@dev` | Full Stack Developer |
| `@qa` | QA Engineer |
| `@architect` | Arquiteto |
| `@sm` | Scrum Master (cria stories) |
| `@pm` | Product Manager |
| `@po` | Product Owner |
| `@analyst` | Analista de Negócio |
| `@ux-design-expert` | UX Designer |
| `@devops` | DevOps (único com autoridade de git push) |

## Commands
```bash
npm run dev        # dev server (porta 8080)
npm run build      # production build
npm run typecheck  # TypeScript check
npm run lint       # ESLint

supabase link --project-ref igolxkyahbavripvfeak
supabase db push   # aplicar migrations no projeto ativo
```

## Documentação do projeto
- Stories: `docs/stories/`
- Arquitetura: `docs/architecture.md`
- Requisitos: `PROJECT_REQUIREMENTS.md`
- Dívida técnica: `SECURITY_DEBT.md`
- Framework AIOX: `.triviaiox-core/`
- Guia Claude Code: `.claude/CLAUDE.md`
