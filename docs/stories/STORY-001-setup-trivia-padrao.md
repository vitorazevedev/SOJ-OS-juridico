---
id: STORY-001
title: Setup Padrão Trivia + Instalação Triviaiox
status: Done
type: Setup
priority: Critical
created_at: 2026-06-12
completed_at: 2026-06-12
author: Vitor (Piloto)
implemented_by: "@dev (Claude Code)"
---

# STORY-001 — Setup Padrão Trivia + Instalação Triviaiox

## Objetivo

Trazer o projeto SOJ (Sistema Operacional Jurídico), gerado originalmente via Lovable, para o **padrão Trivia completo** com o framework Triviaiox instalado e o ambiente de desenvolvimento funcional.

---

## Contexto

O projeto SOJ foi criado via Lovable e tinha:
- Estrutura Bulletproof React básica (sem agentes AIOX, sem docs, sem stories)
- Supabase antigo (`rbxpaonwrzrscautujtt`) pausado e inacessível
- `node_modules` corrompido (pastas `lib` de tailwindcss e sucrase vazias)
- Sem `docs/`, `PROJECT_REQUIREMENTS.md`, `architecture.md`, `SECURITY_DEBT.md`
- `.claude/` apenas com `settings.local.json` (sem agentes, hooks, rules)

---

## O que foi feito

### 1. Ambiente local
- [x] Corrigido `node_modules` corrompido (reinstalação limpa via `npm install`)
- [x] Servidor dev rodando em `http://localhost:8080`

### 2. Supabase
- [x] Identificado projeto ativo: `igolxkyahbavripvfeak` (sa-east-1, conta MCP)
- [x] Projeto antigo `rbxpaonwrzrscautujtt` estava pausado — descontinuado
- [x] `.env.local` atualizado com URL e chave do projeto ativo
- [x] `supabase/config.toml` atualizado (site_url → localhost:8080, project-ref correto)
- [x] 8 migrations aplicadas via MCP `execute_sql`:
  - `handle_new_user` trigger na `auth.users`
  - Storage bucket `contracts` e políticas RLS
  - View `dashboard_summary` com `security_invoker = on`
  - Realtime habilitado em `contracts`, `contract_obligations`, `contract_analyses`
  - Coluna `generated_contracts.name`
  - Políticas `users_update` e `users_delete`
  - Coluna `users.onboarding_completed`
- [x] Usuário de teste criado: `vitor.azevedev@gmail.com` / `Azevedev@2026`
  - Organização: "Organização do Vitor" (role: admin)
  - Email confirmado, onboarding marcado como completo

### 3. Framework Triviaiox
- [x] `.triviaiox-core/` copiado (1179 arquivos do Triviaiox v2.1.0)
- [x] `.triviaiox-core/project-config.yaml` criado e adaptado para o SOJ
- [x] `.claude/CLAUDE.md` criado (guia completo de integração Claude Code)
- [x] `.claude/settings.json` criado (hooks: synapse + precompact)
- [x] `.claude/commands/TRIVIAIOX/agents/` — 12 agentes copiados
- [x] `.claude/hooks/` — 14 hooks copiados
- [x] `.claude/rules/` — 10 rules copiadas
- [x] `.claude/settings.local.json` limpo (permissões obsoletas removidas)

### 4. Documentação (Padrão Trivia)
- [x] `CLAUDE.md` raiz atualizado para padrão Trivia completo
- [x] `docs/stories/` criado (estrutura de workflow story-driven)
- [x] `docs/stories/backlog/` criado
- [x] `docs/decisions/` criado (para ADRs)
- [x] `docs/qa/` criado
- [x] `docs/architecture.md` criado (arquitetura completa do SOJ)
- [x] `PROJECT_REQUIREMENTS.md` criado (requisitos e módulos)
- [x] `SECURITY_DEBT.md` criado (dívidas de segurança conhecidas)

---

## Dívidas Técnicas Identificadas

| ID | Descrição | Arquivo |
|---|---|---|
| SD-001 | RLS das tabelas não auditado formalmente | `SECURITY_DEBT.md` |
| SD-002 | Sem validação Zod nos formulários | `SECURITY_DEBT.md` |
| Pendente | Conteúdo do documento estratégico `.docx` não importado para stories | Próxima sessão |

---

## Próximos Passos

1. Compartilhar conteúdo do `SOJ-Documento-Estrategico-Abril2026.docx` para criar stories do backlog
2. Criar `STORY-002` para auditoria de RLS (`@qa *review`)
3. Começar desenvolvimento de features com `@sm *create-story` e `@dev *develop`

---

## Verificação

- [x] `npm run typecheck` — sem erros
- [x] `npm run lint` — sem erros
- [x] App rodando em `http://localhost:8080`
- [x] Login funcionando com `vitor.azevedev@gmail.com`
- [x] Agentes visíveis no Claude Code via `/TRIVIAIOX/agents/`
