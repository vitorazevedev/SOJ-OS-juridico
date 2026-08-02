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
| ~~SD-006~~ | Tabela `temp_org` publicamente legível (RLS desabilitado), órfã e sem uso em código/migrations | Média | @dev | — | **Resolvido 2026-07-31** — dropada após confirmação de que não era referenciada em lugar nenhum |
| ~~SD-007~~ | `recalcular_indice_desequilibrio()` (SECURITY DEFINER, bypassa RLS) não tinha checagem de autorização própria — qualquer usuário autenticado podia sobrescrever o índice de outra organização passando um `analysis_id` arbitrário | Alta | @dev | — | **Resolvido 2026-07-31** — adicionada checagem de posse (org do analysis = org do caller, ou `service_role`) |
| ~~SD-008~~ | `dashboard_summary.avg_risk_score` e a exportação LGPD (`dataExport.ts`) vazavam `risk_score`/`indice_desequilibrio` reais no payload da API para contas Freemium — o bloqueio até então era só visual na UI (o dado pago aparecia inteiro na aba Network do navegador) | Alta | @dev | — | **Resolvido 2026-08-04** — mesmo padrão de `contract_analyses_gated`/`list_contracts()`: mascarado por `plan_status` na própria view/query |
| ~~SD-009~~ | `send-obligation-alerts` marcava o alerta de obrigação como enviado (`alert_sent_X = true`) *antes* de confirmar que o e-mail saiu — se o envio falhasse (domínio Resend não verificado, rate limit, etc.), o alerta nunca mais era reenviado nem notado. Risco de perda silenciosa de prazo contratual, achado na auditoria pré-lançamento | Alta | @dev | — | **Resolvido 2026-08-04** — flag só é gravado após confirmar que pelo menos um destinatário elegível recebeu (ou que não havia nenhum elegível); falha de envio deixa o flag pendente pro cron do dia seguinte tentar de novo |
| ~~SD-010~~ | `send-obligation-alerts`, `enforce-data-retention` e `fetch-economic-indexes` rodam com `verify_jwt=false` (necessário — pg_cron chama sem Authorization) mas o corpo não checava segredo nenhum; qualquer um que descobrisse a URL podia disparar a function (nenhuma delas era destrutiva, mas `send-obligation-alerts` dispara e-mail real) | Média | @dev | — | **Resolvido 2026-08-04** — segredo compartilhado (`CRON_SECRET`, guardado no Supabase Vault e injetado nos próprios jobs de cron) validado no início de cada function |

---

## Mitigações Planejadas

_Nenhuma pendente no momento._

---

## Itens em Monitoramento

- Tokens de sessão: expiração em 1h (padrão Supabase) — adequado para MVP
- Chaves expostas: apenas `VITE_SUPABASE_ANON_KEY` (publishable) no frontend — correto
- `service_role` key: não presente em nenhum arquivo do repositório — verificar antes de cada PR
- `react-router-dom@6.30.x`: 2 CVEs moderadas (open redirect via `<Link>`/`useNavigate`; injeção via `deserializeErrors()` em hidratação SSR). Correção exige major bump pra v7 (sem patch dentro do v6) — adiado do lançamento de 2026-08-05 por risco de quebra sem tempo de teste. App é SPA sem SSR, então a segunda CVE não se aplica hoje. Fazer o upgrade com calma pós-lançamento.
- Remetente de e-mail (`alertas@ponderum.com`, Resend) — confirmar que o domínio está com SPF/DKIM verificados no painel do Resend antes do lançamento; sem isso, alertas de obrigação falham silenciosamente (mitigado por SD-009, mas o ideal é o envio funcionar de fato)

---

## Checklist de Segurança por Feature

Antes de marcar qualquer story como Done:
- [ ] RLS habilitado na tabela nova/alterada
- [ ] Políticas de acesso por `auth.uid()` e organização
- [ ] Sem `service_role` key no código frontend
- [ ] Sem dados sensíveis em `raw_user_meta_data` (usar `raw_app_meta_data`)
- [ ] Inputs validados com Zod
- [ ] Sem `console.log` com dados de usuário
