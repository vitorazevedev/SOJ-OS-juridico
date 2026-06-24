---
id: STORY-006
title: Geração de Contratos com Templates
status: InProgress
type: Feature
priority: High
phase: MVP — Fase 1 (Meses 1-3)
module: Módulo 7 — Gerador de Contratos (Parcial)
epic: Geração de Documentos
created_at: 2026-06-12
author: Vitor (Piloto)
estimated_effort: 8 dias
---

# STORY-006 — Geração de Contratos com Templates

## Objetivo

Permitir que o usuário gere contratos profissionais a partir de 5 templates iniciais, preenchendo um wizard guiado com as informações das partes — e receba um PDF ou DOCX pronto para assinar, personalizado com os dados da organização.

---

## Contexto

O SOJ já tem a tela `Generator.tsx` e a tabela `generated_contracts` com estrutura básica. Atualmente a geração é simulada ou incompleta. Esta story implementa a geração real via Claude API + export para PDF/DOCX.

### 5 Templates do MVP

| # | Template | Uso |
|---|---|---|
| 1 | **Prestação de Serviços** | Freelancers, agências, consultores |
| 2 | **NDA — Acordo de Confidencialidade** | Parcerias, negociações, vendas |
| 3 | **SaaS — Licença de Software** | Empresas de software / SaaS |
| 4 | **Parceria Comercial** | Representantes, distribuidores, co-vendas |
| 5 | **Fornecimento de Produtos** | Compra e venda, supply chain |

Cada template já inclui cláusulas seguras por padrão: conformidade com CC/2002, LGPD básica, limitação de responsabilidade razoável.

---

## Escopo (In)

- [x] Wizard de 4 etapas para geração (`src/pages/Generator.tsx`, `step` 1-4):
  1. Seleção do template
  2. Dados das partes (contratante + contratado)
  3. Condições específicas (valor, prazo, escopo)
  4. Revisão + exportação
- [x] 6 templates em português jurídico (`src/data/soj.ts` `TEMPLATES` — Prestação de Serviços, NDA, Fornecimento, Licenciamento SaaS, Parceria Comercial, Consultoria), excede os 5 do MVP
- [ ] Geração do texto via Claude Sonnet (personalização + adaptação ao contexto) — **não implementado**. Geração é 100% client-side por substituição de variáveis em template estático, sem chamada à Claude API
- [x] Export para PDF — via `jsPDF` em `src/lib/contractDocs.ts` (`generateContractPdfBlob`), client-side
- [x] Export para DOCX — `src/hooks/useGeneratedContracts.ts` (`docxBlob`)
- [x] Salvar contrato gerado em `generated_contracts` + Storage bucket `contracts`
- [x] Preview do contrato antes de exportar (step 4 — revisão)
- [x] Logo da organização no cabeçalho — `useOrganization().logoUrl` injetado no PDF/DOCX

## Fora do Escopo (Out)

- Assinatura digital integrada (DocuSign/ZapSign) — fase futura (Módulo 8)
- Templates customizados pelo usuário — fase futura
- Geração a partir de análise de contrato existente — fase futura
- Templates em inglês — fase futura

---

## Critérios de Aceitação

```
Dado que o usuário acessa o Gerador de Contratos
Quando ele seleciona "Prestação de Serviços"
Então o wizard exibe os campos relevantes:
  - Nome e CNPJ/CPF do contratante
  - Nome e CNPJ/CPF do contratado
  - Descrição do serviço
  - Valor e forma de pagamento
  - Prazo de execução
  - Foro

Dado que o usuário preenche todos os campos obrigatórios
Quando ele clica em "Gerar Contrato"
Então o sistema:
  - Chama Claude API para personalizar o template
  - Exibe preview do contrato gerado
  - Permite exportar em PDF e DOCX

Dado que a organização tem logo cadastrada
Quando o contrato é gerado
Então o logo aparece no cabeçalho do PDF/DOCX

Dado que o usuário escolhe "Exportar PDF"
Quando o download é concluído
Então o arquivo baixado é um PDF válido com o contrato completo e formatado
```

---

## Tarefas Técnicas

### Templates (Arquivos de Base)
- [x] Templates implementados como dados estruturados em `src/data/soj.ts` (`TEMPLATES`), não como arquivos markdown individuais em `supabase/functions/generate-contract/templates/`. A montagem das seções do contrato acontece client-side em `src/lib/contractDocs.ts` (`buildContractSections`)

### Edge Function: Geração
- [ ] `supabase/functions/generate-contract/index.ts` — **não existe**. Não há Edge Function de geração; tudo roda no cliente (substituição de variáveis), sem chamada à Claude API para personalização de linguagem

### Edge Function: Export PDF/DOCX
- [ ] `supabase/functions/export-contract/index.ts` — **não existe**. Export é 100% client-side via `jsPDF` (PDF) e geração de DOCX em `src/hooks/useGeneratedContracts.ts`, sem Edge Function/Puppeteer. Upload para Storage acontece a partir do cliente após geração local.

### Banco de Dados
- [x] Colunas em `generated_contracts` — presentes com nomenclatura própria do projeto (`content_docx` confirmado em `useGeneratedContracts.ts`); não confirmado se `template_id`/`template_fields`/`pdf_url`/`docx_url`/`generation_status` existem exatamente como especificado — revisar migrations antes de marcar como 100% conforme

### Frontend
- [ ] `TemplateSelector.tsx` — não existe como componente separado; seleção de template é inline em `Generator.tsx` (step 1)
- [ ] `ContractWizard.tsx` — não existe como componente separado; wizard é a própria página `Generator.tsx` com state `step`
- [ ] `ContractPreview.tsx` — não existe como componente separado; preview é inline (step 4)
- [x] `src/pages/Generator.tsx` — implementado (com os componentes acima inline, não extraídos)

### Validação (Zod)
- [x] Schema de validação com Zod — implementado nesta sessão (`contractFormSchema` em `src/pages/Generator.tsx`): valida nome obrigatório, limites de tamanho de campo, e CNPJ/CPF via `.refine()` reaproveitando `validateDocument`. Validado tanto no botão "Pré-visualizar" quanto em `handleGenerate` (defesa em profundidade na fronteira real, antes de persistir). Não é um schema por template (o formulário é único para todos os templates), mas atende à regra inviolável de ter Zod na fronteira do formulário.
- [x] Validação de CNPJ (14 dígitos) e CPF (11 dígitos) com algoritmo de dígito verificador — `src/lib/brazilianDocs.ts` (`validateDocument`, `validateCnpj`, `validateCpf`), agora integrada ao schema Zod via `.refine()`
- [ ] Validação de email e telefone nos campos de partes — o formulário do wizard não tem campos de email/telefone para as partes (apenas nome, CNPJ/CPF, cidade); os e-mails de signatários no modal "Enviar para Assinatura" usam `<Input type="email">` do HTML, sem validação Zod — gap menor, não bloqueia geração do contrato

---

## Dependências

- `generated_contracts` tabela já existe (criada nas migrations da STORY-001)
- Storage bucket `contracts` já existe
- Claude API key configurada como Supabase Secret
- Library `docx` ou equivalente para geração de DOCX
- Solução PDF: avaliar `pdfkit` (Edge Function) vs `Puppeteer` (mais pesado) vs `jsPDF` (client-side)

---

## Definition of Done

- [x] `npm run typecheck` — sem erros
- [x] `npm run lint` — sem erros (6 warnings pré-existentes/aceitos, não relacionados)
- [ ] Todos os 5 templates geram contratos válidos (testados manualmente)
- [ ] Export PDF gera arquivo válido e legível
- [ ] Export DOCX abre corretamente no Word/LibreOffice
- [ ] Validação de formulário funciona (campos obrigatórios, CNPJ/CPF)
- [ ] Contrato gerado salvo no Storage e listado no histórico
- [ ] Story atualizada para `status: Done`

---

## Notas de Qualidade Jurídica

Os templates devem ser revisados por um advogado antes do lançamento. Para o beta (30 clientes), pode-se usar o disclaimer:

> "Este contrato foi gerado pelo SOJ com base em modelos padrão de mercado. Recomendamos revisão por advogado antes da assinatura."

Cláusulas obrigatórias em todos os templates:
- Foro (cidade + estado)
- Lei aplicável (Brasil)
- Cláusula de confidencialidade básica
- Limitação de responsabilidade (exceto dolo)
- Referência ao tratamento de dados pessoais (LGPD Art. 7)

---

## Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Claude gera cláusula juridicamente incorreta | Média | Alto | Templates com base fixa + Claude apenas adapta linguagem; revisão jurídica dos templates |
| PDF gerado com formatação ruim | Média | Médio | Usar CSS bem definido; testar em múltiplos leitores |
| Usuário usa contrato gerado sem revisão | Alta | Alto | Disclaimer claro em cada step do wizard |
| Custo Sonnet por geração de contrato | Média | Médio | Cache de contratos idênticos; Haiku para adaptações simples |

---

## Referências

- Documento Estratégico: Módulo 7 (Camada Geração Inteligente)
- `src/pages/Generator.tsx` — tela atual
- `src/types/database.types.ts` — schema de `generated_contracts`
- `src/lib/contractDocs.ts` — utilitários existentes de geração de documentos
- `src/lib/receiptPdf.ts` — referência de geração de PDF existente

---

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6 (auditoria de código existente, sem nova implementação nesta sessão)

### Completion Notes List

- O wizard de 4 etapas, os 6 templates, export PDF/DOCX, logo no cabeçalho e validação de CNPJ/CPF com dígito verificador **já estão implementados e funcionais** — surpreendentemente mais completo do que sugerido pelo status `Backlog`.
- Gaps reais (não apenas divergência de arquitetura, mas funcionalidade ausente):
  - **Nenhuma chamada à Claude API** — a "personalização + adaptação ao contexto" central do Escopo não existe; geração é puramente template + substituição de variáveis no cliente. Isso é o maior gap funcional da story.
  - **Nenhuma Edge Function** (`generate-contract`, `export-contract`) — tudo roda no cliente, incluindo geração de PDF/DOCX. Isso pode ser uma decisão válida (mais simples, sem custo de IA), mas diverge do Escopo e dos Critérios de Aceitação, que descrevem explicitamente "Chama Claude API para personalizar o template".
  - Componentes de UI não foram extraídos (`TemplateSelector`, `ContractWizard`, `ContractPreview` não existem como arquivos).
- **Implementado nesta sessão:** adicionado `contractFormSchema` (Zod) em `Generator.tsx`, resolvendo a violação da regra inviolável "Zod em todas as fronteiras" do `CLAUDE.md`. O schema reaproveita `validateDocument` (CNPJ/CPF) via `.refine()`, substitui o estado ad-hoc `docErrors` por um `errors: Partial<Record<keyof FormState, string>>` genérico, e é executado em dois pontos: no botão "Pré-visualizar →" (gate de UI) e em `handleGenerate` (gate na fronteira real, antes de persistir em `generated_contracts` — defesa em profundidade, já que o estado do wizard não é restaurável por URL mas a validação no momento da gravação é a que realmente importa).
  - Esta é a primeira utilização de `zod` no código do projeto (a dependência já estava no `package.json`, mas não usada em lugar nenhum).
- Recomendação: @po e @architect decidirem se a ausência de personalização via Claude é aceitável para o MVP (reduz custo e complexidade, mas reduz o diferencial de "linguagem jurídica adaptada ao contexto" prometido).

### File List
- `src/pages/Generator.tsx` — adicionado `contractFormSchema` (Zod), `validateForm`, substituído `docErrors` por `errors` genérico, validação no botão "Pré-visualizar" e em `handleGenerate`

### Change Log
| Data | Mudança | Autor |
|---|---|---|
| 2026-06-20 | Checkboxes de Escopo e Tarefas Técnicas corrigidos para refletir implementação real já existente (Generator.tsx, contractDocs.ts, useGeneratedContracts.ts, brazilianDocs.ts) — gaps reais identificados: sem Claude API, sem Edge Functions, sem Zod | @dev (Dex) |
| 2026-06-20 | Implementada validação Zod no wizard de geração de contratos (`contractFormSchema`), resolvendo violação de regra inviolável do CLAUDE.md. `npm run typecheck` e `npm run lint` sem novos erros. | @dev (Dex) |
