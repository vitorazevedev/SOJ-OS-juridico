---
title: Pedido de revisão jurídica — Termos, Privacidade e Retenção de Dados (LGPD)
status: Aguardando revisão do Fellipe
created_at: 2026-06-24
author: "@dev (Dex)"
audience: "Fellipe (sócio do Vitor no SOJ, advogado responsável pela revisão jurídica) — NÃO é uma análise jurídica, é uma solicitação de revisão"
---

# Pedido de Revisão Jurídica — SOJ

Fellipe — preparei este resumo para facilitar sua revisão. Como sócio no desenvolvimento do SOJ, você já tem o contexto de produto; o objetivo aqui é só organizar especificamente os pontos que precisam do seu aval jurídico antes do beta.

**Importante:** este documento foi preparado por uma IA de desenvolvimento (Claude/Dex), não por um advogado. Ele organiza o que precisa de validação jurídica — não substitui essa validação. Nada aqui deve ser tratado como aconselhamento legal.

## Contexto do produto

O SOJ é uma plataforma de análise de contratos via IA. Usuários (empresas/escritórios) fazem upload de contratos que **frequentemente contêm dados pessoais de terceiros** — as partes contratantes, que nunca têm relação de consentimento direta com o SOJ. Isso coloca o SOJ na posição de **operador de dados pessoais** (LGPD, Lei 13.709/2018), além de controlador dos dados da própria conta do usuário.

## O que precisa de revisão

### 1. Termos de Uso (rascunho em `src/pages/Termos.tsx`, visível em `/termos`)
Rascunho mínimo cobrindo: natureza do serviço (não é aconselhamento jurídico), responsabilidade do usuário por ter base legal para os dados que envia, limitação de responsabilidade, cancelamento. **Pergunta para o advogado:** esse rascunho protege adequadamente o SOJ quanto a (a) responsabilidade por decisões tomadas com base nas análises de IA, e (b) responsabilidade caso um usuário envie dados sem ter base legal para isso?

### 2. Política de Privacidade (rascunho em `src/pages/Privacidade.tsx`, visível em `/privacidade`)
Rascunho cobrindo: papel do SOJ (controlador da conta, operador dos dados de contrato), dados coletados, finalidade, compartilhamento com terceiros (Supabase, Anthropic, Resend), direitos do titular, retenção, segurança. **Pergunta para o advogado:** o texto está completo e correto para o contexto de operador de dados de terceiros sem consentimento direto? Falta alguma cláusula obrigatória?

### 3. Período de retenção de dados (decisão de negócio, não só jurídica)
Implementei um job técnico (`supabase/functions/enforce-data-retention`) que **sinaliza** (não exclui) organizações sem atividade há mais de 24 meses — esse número é um placeholder conservador, não uma decisão validada. **Pergunta para o advogado:** existe uma exigência legal/fiscal de retenção mínima de documentos contratuais que devêssemos respeitar antes de permitir exclusão? (Ex.: obrigações fiscais costumam exigir 5 anos para alguns documentos no Brasil — mas isso precisa ser confirmado para o caso específico de contratos analisados por terceiros, não documentos fiscais do próprio SOJ.)

### 4. Exclusão de conta (`supabase/functions/delete-account`)
Implementei exclusão real e irreversível de todos os dados da organização quando o usuário solicita pela tela de Configurações. **Pergunta para o advogado:** essa exclusão imediata e irreversível é adequada, ou deveríamos ter um período de carência (ex.: 30 dias) antes da exclusão definitiva, para casos de exclusão acidental ou disputa?

### 5. Base legal para o tratamento de dados de terceiros
O SOJ processa contratos que mencionam pessoas que nunca autorizaram diretamente o SOJ a tratar seus dados — a base legal vem do usuário do SOJ (que afirma ter autorização para compartilhar). **Pergunta para o advogado:** os Termos de Uso atuais (item 3: "Você declara ter base legal para compartilhar esse conteúdo") são suficientes para transferir essa responsabilidade ao usuário, ou o SOJ precisa de salvaguardas adicionais?

## O que NÃO está nesta revisão (fora de escopo, mas relevante)
- Certificações de segurança (ISO 27001, SOC 2)
- Contrato de operador de dados (DPA) formal com clientes Enterprise
- Definição de Encarregado de Dados (DPO) — decisão de negócio separada

## Onde encontrar mais contexto técnico
- `docs/stories/backlog/STORY-007-auditoria-lgpd-seguranca.md` — story completa, com auditoria de segurança (RLS, audit logs) já realizada e confirmada correta
- `docs/decisions/2026-06-21-decisoes-pendentes-backlog-fase1.md` — decisões de produto relacionadas
