# SOJ — Security Debt

> Registro de dívidas de segurança conhecidas. Atualizar quando identificadas ou resolvidas.

---

## Dívidas Conhecidas

| ID | Descrição | Severidade | Responsável | Prazo |
|---|---|---|---|---|
| SD-001 | RLS das tabelas no projeto `igolxkyahbavripvfeak` não verificada — migrations foram aplicadas mas políticas não foram auditadas | Alta | @qa | Próxima sprint |
| SD-002 | Sem validação Zod em formulários existentes (contratos, obrigações) | Média | @dev | Próxima sprint |
| SD-003 | `supabase/config.toml` ainda referencia project-ref antigo nos comentários | Baixa | @devops | Já tratado em STORY-001 |

---

## Mitigações Planejadas

| ID | Mitigação | Story |
|---|---|---|
| SD-001 | Auditoria completa de RLS com `supabase db advisors` | STORY-002 (backlog) |
| SD-002 | Adicionar Zod schemas em todos os formulários | A criar |

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
