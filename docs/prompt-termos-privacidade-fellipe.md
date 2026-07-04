# Prompt para Fellipe — Base Técnica para Termos de Uso e Política de Privacidade

> **Instrução de uso:** Cole o conteúdo abaixo diretamente no Claude como contexto antes de pedir a redação dos documentos. Ele contém todas as informações técnicas reais da plataforma para embasar os textos jurídicos.

---

## PROMPT PARA O CLAUDE

```
Você é um advogado especializado em direito digital e LGPD no Brasil.
Preciso que você redija dois documentos para uma plataforma SaaS de inteligência
contratual chamada Ponderum, pertencente à GVF Serviços de Tecnologia Ltda.
(empresa em processo de constituição, com sede no Brasil).

Use como base EXCLUSIVAMENTE as informações técnicas reais abaixo — não invente
funcionalidades ou práticas que não estejam descritas. Os documentos devem ser
claros, precisos juridicamente e acessíveis para o usuário leigo.

---

## INFORMAÇÕES TÉCNICAS DA PLATAFORMA

### 1. O QUE É O PONDERUM
Plataforma SaaS (Software como Serviço) de inteligência contratual.
Permite que empresas e advogados enviem contratos para análise automatizada
por inteligência artificial. A IA identifica cláusulas de risco, sugere
mitigações e organiza prazos e obrigações.

**O Ponderum NÃO:**
- Presta serviços de advocacia
- Emite pareceres jurídicos
- Garante a validade jurídica dos contratos analisados
- Substitui a avaliação de um advogado habilitado

### 2. EMPRESA CONTROLADORA
- Razão social: GVF Serviços de Tecnologia Ltda.
- Status: em processo de constituição
- País: Brasil
- Sócios: Vitor Azevedo (desenvolvedor), Fellipe [sobrenome] (advogado),
  Kober [sobrenome] (financeiro)

### 3. DADOS COLETADOS

#### 3.1 Dados de cadastro
- Nome completo do usuário
- Endereço de e-mail
- Senha (armazenada com hash — nunca em texto puro)
- Nome da organização/empresa
- CNPJ ou CPF (opcional)
- Setor de atuação (opcional)

#### 3.2 Dados de contratos enviados
- Arquivos enviados pelo usuário: PDF, Word (.docx) e imagens (JPG/PNG)
- Texto extraído dos contratos pela IA
- Resultados da análise (score de risco, cláusulas identificadas, sugestões)
- Valores financeiros estimados associados às cláusulas
- Obrigações e prazos cadastrados manualmente pelo usuário

#### 3.3 Dados de uso
- Contratos gerados pela plataforma usando templates disponíveis
- Feedbacks enviados pelo usuário (sugestões, erros reportados)
- Logs de auditoria de criações e exclusões de contratos

#### 3.4 Dados técnicos (coletados automaticamente)
- Endereço IP de acesso
- Tipo de navegador e sistema operacional
- Páginas acessadas dentro da plataforma
- Erros técnicos ocorridos durante o uso (monitorados pelo Sentry)
- Cookies de sessão e dados de localStorage para preferências de interface

### 4. PARA QUE OS DADOS SÃO USADOS
- Prestação do serviço de análise contratual
- Envio de alertas por e-mail sobre vencimento de obrigações
- Monitoramento de erros técnicos para manutenção da plataforma
- Coleta de feedback para melhoria do produto
- Controle de limites de uso por plano (ex: Starter: 5 contratos/mês)
- Comunicações operacionais (ex: confirmação de cadastro, recuperação de senha)

### 5. TERCEIROS QUE PROCESSAM DADOS

| Serviço | Empresa | Finalidade | Dados acessados |
|---|---|---|---|
| **Supabase** | Supabase Inc. (EUA) | Banco de dados, autenticação, armazenamento de arquivos | Todos os dados da plataforma |
| **Anthropic / Claude API** | Anthropic PBC (EUA) | Análise de contratos por IA (extração de texto e identificação de riscos) | Conteúdo dos contratos enviados para análise |
| **Resend** | Resend Inc. (EUA) | Envio de e-mails transacionais (alertas, confirmações) | Nome e e-mail do destinatário |
| **Netlify** | Netlify Inc. (EUA) | Hospedagem da interface web | IPs de acesso e logs de requisição |
| **Sentry** | Functional Software Inc. (EUA) | Monitoramento de erros em produção | Dados técnicos de erros (sem dados pessoais identificáveis nas mensagens) |

**Nota importante sobre a Anthropic/Claude:** o conteúdo dos contratos enviados
para análise é transmitido à API da Anthropic nos EUA. O Ponderum adota medidas
de isolamento (tags XML no prompt) para evitar que instruções dentro dos contratos
influenciem o comportamento da IA.

**Armazenamento:** os dados são armazenados em servidor da Supabase localizado
na região sa-east-1 (São Paulo, Brasil).

### 6. PLANOS E LIMITES DE USO
- **Plano Starter (gratuito):** até 5 contratos analisados por mês
- **Plano Pro:** análises ilimitadas (valores a definir)
- **Plano Enterprise:** a definir

### 7. TIPOS DE ARQUIVO ACEITOS
- PDF: até 32 MB por arquivo
- Word (.docx): até 50 MB por arquivo
- Imagens JPG/PNG (documentos escaneados): até 5 MB por arquivo

### 8. MODELO MULTIUSUÁRIO (ORGANIZAÇÃO)
- Cada conta está vinculada a uma organização
- Uma organização pode ter múltiplos usuários (membros)
- Todos os membros de uma organização compartilham acesso aos contratos da organização
- Dados são isolados por organização — membros não acessam contratos de outras organizações

### 9. DIREITOS DO TITULAR (LGPD ART. 18)
Todos os seguintes direitos estão implementados tecnicamente na plataforma:
- **Acesso e portabilidade:** exportação completa dos dados em JSON ou PDF legível
  disponível em Configurações > Privacidade e Dados
- **Exclusão:** exclusão completa da conta e de todos os dados associados
  (contratos, análises, arquivos, usuários da organização) disponível em
  Configurações > Privacidade e Dados
- **Correção:** o usuário pode atualizar seus dados de perfil e organização
  diretamente na plataforma
- **Revogação de consentimento:** pode ser exercida via exclusão da conta

### 10. RETENÇÃO DE DADOS
- Dados ativos: mantidos enquanto a conta estiver ativa
- Inatividade: organizações sem atividade por período prolongado são sinalizadas
  internamente (o prazo exato está em definição com a equipe jurídica)
- Após exclusão de conta: dados são removidos permanentemente e irreversivelmente
- Backup: a Supabase mantém backups automáticos conforme sua política interna

### 11. SEGURANÇA IMPLEMENTADA
- Isolamento de dados por organização (Row Level Security no banco de dados)
- Senhas armazenadas com hash seguro (gerenciado pelo Supabase GoTrue)
- Comunicações criptografadas via HTTPS/TLS
- Tokens de sessão JWT com expiração automática
- Autenticação de dois fatores via Google OAuth disponível
- Limite de tentativas de login (5 tentativas por 5 minutos por IP)
- Validação dos arquivos enviados (verificação de tipo real do arquivo)
- Monitoramento automático de erros em produção

### 12. COOKIES E ARMAZENAMENTO LOCAL
- Cookies de sessão: necessários para manter o login ativo (essenciais)
- localStorage: preferências de interface (ex: tema, filtros de listagem)
- Não utilizamos cookies de rastreamento ou publicidade de terceiros

### 13. CONTEÚDO GERADO PELA IA
- Os contratos gerados pela plataforma usam templates predefinidos
- O aviso legal "este documento foi gerado pelo Ponderum com base em modelos
  padrão de mercado. Recomendamos revisão por advogado habilitado antes da
  assinatura" aparece automaticamente em todos os contratos gerados
- As análises de risco são estimativas da IA e não constituem parecer jurídico

### 14. MENORES DE IDADE
A plataforma é destinada exclusivamente a pessoas jurídicas ou a profissionais
maiores de 18 anos. Não coletamos dados de menores de idade intencionalmente.

### 15. CONSENTIMENTO NO CADASTRO
O usuário deve marcar um checkbox confirmando aceite dos Termos de Uso e
Política de Privacidade antes de criar uma conta (e-mail ou Google OAuth).
O aceite é obrigatório — o botão de cadastro permanece desabilitado até que
seja marcado.

### 16. ALTERAÇÕES NOS DOCUMENTOS
Ainda não há política definida para comunicação de alterações. Fellipe deve
definir o prazo de aviso prévio e o meio de comunicação (e-mail, banner no app).

### 17. CANAL DE CONTATO / DPO
- E-mail oficial: a definir (ponderum.com.br ainda não registrado)
- DPO (Encarregado de Dados): a definir — Fellipe pode assumir ou nomear terceiro
- Endereço da empresa: a definir após constituição formal

---

## DOCUMENTOS A REDIGIR

### Documento 1 — Termos de Uso
Deve cobrir:
- Definição do serviço e limitações (não substitui advogado)
- Elegibilidade (maiores de 18 anos, pessoa jurídica ou profissional)
- Cadastro e responsabilidades do usuário
- Planos e limites de uso
- Propriedade intelectual dos contratos enviados pelo usuário (são do usuário)
- Propriedade intelectual dos contratos gerados pela plataforma (templates)
- Uso aceitável (proibições)
- Limitação de responsabilidade da Ponderum
- Disponibilidade do serviço (sem garantia de uptime definida)
- Rescisão e exclusão de conta
- Legislação aplicável: Brasil — Foro: a definir

### Documento 2 — Política de Privacidade
Deve cobrir todos os itens da seção "Informações técnicas" acima,
estruturado conforme exigências da LGPD (Lei 13.709/2018), incluindo:
- Base legal para cada finalidade de tratamento de dados
- Transferência internacional de dados (Supabase, Anthropic, Resend, Netlify, Sentry)
- Direitos do titular e como exercê-los
- Contato do DPO/Encarregado
- Cookies
- Retenção e exclusão
- Segurança
```

---

## PENDÊNCIAS QUE O FELLIPE PRECISA DEFINIR ANTES DE PUBLICAR

1. **Foro de eleição** — qual comarca para resolução de conflitos?
2. **DPO (Encarregado de Dados)** — Fellipe assume ou indica terceiro?
3. **E-mail de contato** — depende do domínio ponderum.com.br
4. **Prazo de retenção de dados** — quanto tempo após inatividade antes de sinalizar/excluir?
5. **Prazo de aviso para alterações** — quantos dias de antecedência avisar o usuário?
6. **Transferência internacional** — verificar se é necessário cláusula-padrão contratual
   com Anthropic para adequação à LGPD (contratos enviados para análise vão aos EUA)

---

*Documento preparado por Vitor (Dev) em 04/07/2026 para uso do Fellipe na redação dos Termos de Uso e Política de Privacidade do Ponderum.*
