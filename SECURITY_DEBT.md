# SOJ — Security Debt

> Registro de dívidas de segurança conhecidas. Atualizar quando identificadas ou resolvidas.

---

## Dívidas Conhecidas

| ID | Descrição | Severidade | Responsável | Prazo | Status |
|---|---|---|---|---|---|
| ~~SD-001~~ | RLS das tabelas não verificada | Alta | @qa | — | **Resolvido 2026-06-23/24** — auditoria completa via Management API confirmou RLS correta em todas as tabelas (políticas isolam por `org_id`/`get_org_id()`, sem vazamento entre orgs). Políticas versionadas em `supabase/migrations/20260623000000_story007_version_existing_rls_policies.sql`. Ver STORY-007 |
| ~~SD-002~~ | Sem validação Zod em formulários existentes (contratos, obrigações) | Média | @dev | — | **Resolvido 2026-07-11** — `Generator.tsx` (STORY-006), `Settings.tsx` (org/invite) e `NewObligationModal.tsx` já tinham Zod. Único gap real era o diálogo de renomear em `Contracts.tsx`, agora com `renameSchema` |
| SD-003 | `supabase/config.toml` ainda referencia project-ref antigo nos comentários | Baixa | @devops | — | Já tratado em STORY-001 |
| SD-004 | Limite de contratos/mês por plano (Starter: 5) era só texto na UI, sem aplicação real — qualquer cliente podia consumir IA ilimitadamente | Alta | @dev | — | **Resolvido 2026-06-24** — `parse-contract` agora verifica a cota mensal antes de chamar a Claude API e retorna HTTP 402 se excedida. Testado com conta descartável (bloqueou no 6º contrato do plano Starter; não bloqueou no plano Pro) |
| ~~SD-005~~ | `npm run test` estava quebrado — Vitest sem `test` config (sem `environment`/`setupFiles`) rodava por engano os testes internos do `.triviaiox-core` (que falham por dependência faltando), e zero testes reais do produto existiam | Média | @dev | — | **Resolvido 2026-07-11** — `vite.config.ts` configurado (jsdom + globals + exclude `.triviaiox-core`). 29 testes novos cobrindo as barreiras de fronteira: magic bytes de upload (`fileValidation.test.ts` — impede executável renomeado para .pdf/.docx), validação de CPF/CNPJ (`brazilianDocs.test.ts`), e validação Zod do formulário do gerador (`generatorForm.test.ts`) |

---

## Mitigações Planejadas

_Nenhuma pendente no momento._

---

## Itens em Monitoramento

- Tokens de sessão: expiração em 1h (padrão Supabase) — adequado para MVP
- Chaves expostas: apenas `VITE_SUPABASE_ANON_KEY` (publishable) no frontend — correto
- `service_role` key: não presente em nenhum arquivo do repositório — verificar antes de cada PR

---

## Checklist de Segurança por Feature

Antes de marcar qualquer story como Done:
- [ ] RLS habilitado na tabela nova/alterada
- [ ] Políticas de acesso por `auth.uid()` e organização
- [ ] Sem `service_role` key no código frontend
- [ ] Sem dados sensíveis em `raw_user_meta_data` (usar `raw_app_meta_data`)
- [ ] Inputs validados com Zod
- [ ] Sem `console.log` com dados de usuário
