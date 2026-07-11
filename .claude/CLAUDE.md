# SOJ — Sistema Operacional Jurídico
## Guia de Integração Claude Code · Padrão Trivia

---

## Constituição do Projeto

Três princípios invioláveis que nunca quebram:

1. **Documentação é código** — specs existem antes do código, não depois. Nenhum arquivo de código é criado sem story aprovada.
2. **Segurança não é opcional** — RLS em todas as tabelas, Zod em todas as fronteiras, JWT validado. Sem atalhos.
3. **Mudanças mínimas** — implementar exatamente o que foi pedido na story. Sem extras não solicitados.

---

## Piloto

| Papel | Nome | Responsabilidade |
|---|---|---|
| Piloto / Product Owner | Vitor | Define o que construir, aprova planos, revisa entregas |
| Agentes AIOX | @dev, @qa, @architect, @sm, @pm, @po, @analyst, @ux-design-expert, @devops, @triviaiox-master | Implementam, testam, documentam |

---

## Stack

- **Frontend:** React 18 + Vite 5 + TypeScript (strict)
- **Styling:** Tailwind CSS v3 + shadcn/ui
- **State/Cache:** TanStack Query v5
- **Routing:** React Router v6 (lazy-loaded)
- **Backend:** Supabase (Auth, Postgres, Storage, Realtime)
- **Deploy:** Vercel (frontend) + Supabase Edge Functions (backend)

---

## Arquitetura — Bulletproof React

```
src/
  app/            # App.tsx + providers globais
  components/
    layout/       # AppLayout, AppSidebar, BottomNav, OnboardingModal, Charts
    ui/           # shadcn/ui — NÃO editar manualmente
  config/         # env.ts — variáveis de ambiente tipadas com validação
  data/           # soj.ts — dados mock para Dashboard/Análise
  features/
    auth/
      components/ # AuthProvider, ProtectedRoute
  hooks/          # Hooks compartilhados (useContracts, useObligations, etc.)
  lib/            # supabase.ts, query-client.ts, contractDocs.ts, receiptPdf.ts, utils.ts
  pages/          # Uma página por rota
  types/          # database.types.ts — schema do Supabase
  index.css       # Design tokens (CSS variables) + estilos base
  main.tsx        # Entrypoint React
```

### Módulos de Negócio Identificados
| Módulo | Página | Status |
|---|---|---|
| Dashboard | `src/pages/Dashboard.tsx` | Implementado (mock) |
| Contratos | `src/pages/Contracts.tsx` | Implementado |
| Obrigações | `src/pages/Obligations.tsx` | Implementado |
| Análise de Risco | `src/pages/Analysis.tsx` | Implementado |
| Gerador de Documentos | `src/pages/Generator.tsx` | Implementado |
| Configurações | `src/pages/Settings.tsx` | Implementado |

---

## Variáveis de Ambiente

| Variável | Descrição |
|---|---|
| `VITE_SUPABASE_URL` | URL do projeto Supabase ativo |
| `VITE_SUPABASE_ANON_KEY` | Chave pública (publishable) do Supabase |

**Regra:** sempre importar de `@/config/env`, nunca de `import.meta.env` diretamente.

---

## Supabase

- **Projeto ativo:** `igolxkyahbavripvfeak` (sa-east-1)
- **URL:** `https://igolxkyahbavripvfeak.supabase.co`
- **Bucket Storage:** `contracts` (contratos + logos + docs gerados)
- **Realtime:** habilitado em `contracts`, `contract_obligations`, `generated_contracts`, `contract_analyses`
- **Auth hook:** `useAuth()` de `@/features/auth/components/AuthProvider`

---

## Convenções de Código

```ts
// ✅ Correto — import de lib centralizada
import { supabase } from '@/lib/supabase'
import { env } from '@/config/env'

// ❌ Errado — imports proibidos
import { supabase } from '@/integrations/supabase/client'
import.meta.env.VITE_SUPABASE_URL
```

- Componentes: máx 300 linhas
- Lazy loading em todas as rotas (exceto home/login)
- Features não importam umas das outras
- Layout components em `@/components/layout/`, nunca em `@/components/soj/`

---

## Design System

- Dark legal-tech UI — todas as cores são CSS variables HSL
- Primary: `hsl(var(--primary))` — verde `#00e5a0`
- Risk levels: `--risk-critical`, `--risk-high`, `--risk-medium`, `--risk-low`
- Tailwind custom colors: `primary-dim`, `risk-*`, `info`, `sidebar-*`

---

## Sistema de Agentes AIOX

Invocar agentes com `@nome` no prompt:

| Agente | Papel | Comando principal |
|---|---|---|
| `@triviaiox-master` | Orquestrador mestre | `*help`, `*create`, `*validate` |
| `@dev` | Full Stack Developer | `*develop`, `*execute-subtask` |
| `@qa` | QA Engineer | `*review`, `*validate-story` |
| `@architect` | Arquiteto de Sistemas | `*design`, `*review-architecture` |
| `@pm` | Product Manager | `*create-prd`, `*create-epic` |
| `@po` | Product Owner | `*prioritize`, `*approve-story` |
| `@sm` | Scrum Master | `*create-story`, `*create-next-story` |
| `@analyst` | Business Analyst | `*analyze`, `*brainstorm` |
| `@ux-design-expert` | UX Designer | `*review-ux`, `*design-flow` |
| `@devops` | DevOps | `*deploy`, `*push` (único com autoridade de git push) |

---

## Workflow Story-Driven

1. **Backlog** → stories em `docs/stories/backlog/` (aguardando refinamento)
2. **Ready** → story movida para `docs/stories/` com status `Ready`
3. **In Progress** → `@dev` implementa, atualiza status para `In Progress`
4. **QA** → `@qa` valida, atualiza status para `In QA`
5. **Done** → status `Done`, story arquivada

Nunca criar código sem story aprovada. Se não há story, criar uma com `@sm *create-story`.

---

## Comandos

```bash
npm run dev        # servidor de desenvolvimento (porta 8080)
npm run build      # build de produção
npm run typecheck  # verificação TypeScript
npm run lint       # ESLint

supabase link --project-ref igolxkyahbavripvfeak
supabase db push   # aplicar migrations
supabase db pull   # gerar migration do estado atual do banco
```

---

## Definition of Done

Antes de marcar qualquer story como Done:

- [ ] TypeScript sem erros (`npm run typecheck`)
- [ ] Lint sem erros (`npm run lint`)
- [ ] RLS habilitado em tabelas novas/alteradas
- [ ] Zod validation em todas as fronteiras (formulários, APIs)
- [ ] Sem `console.log` de debug no código commitado
- [ ] Story atualizada com status `Done`
- [ ] Nenhuma variável de ambiente hardcoded

---

## Protocolo Anti-Conflito (Lovable + Claude)

Se o projeto for editado via Lovable:
- Fazer `git pull --rebase origin main` antes de qualquer implementação
- Preservar sempre: `.triviaiox-core/`, `.claude/`, `CLAUDE.md`, `PROJECT_REQUIREMENTS.md`, `docs/`
- Claude commita e faz push; Lovable sincroniza automaticamente do GitHub

---

## Referências

- Stories: `docs/stories/`
- Arquitetura: `docs/architecture.md`
- Requisitos: `PROJECT_REQUIREMENTS.md`
- Dívida técnica: `SECURITY_DEBT.md`
- Framework: `.triviaiox-core/`
