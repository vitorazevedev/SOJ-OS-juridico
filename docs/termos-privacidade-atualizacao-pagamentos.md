# Atualização de Termos de Uso e Política de Privacidade - Módulo de Pagamentos

> Base técnica do que mudou desde a última redação (04/07/2026, ver `docs/prompt-termos-privacidade-fellipe.md`), agora que o Módulo de Pagamentos está implementado e testado. Cole isso no Claude junto com os textos atuais de `/termos` e `/privacidade` para pedir a revisão das cláusulas afetadas. Não precisa redigir do zero, só ajustar o que mudou.

---

## 1. Por que precisa mexer

Os planos, preços e todo o fluxo de cobrança mudaram completamente desde que a Cláusula 5 dos Termos foi escrita. A Política de Privacidade nunca mencionou o processador de pagamento, que agora trata CPF/CNPJ, endereço e dados de cobrança de todo cliente pago. Isso já estava sinalizado como pendência na própria especificação técnica do módulo ("Termos de Uso e Política de Privacidade com cláusulas de pagamento, renovação, cancelamento e reembolso, revisão jurídica").

---

## 2. TERMOS DE USO - o que precisa mudar

### Cláusula 5 (Planos e Limites de Uso) - reescrever por completo

**Texto atual** descreve: Freemium, Plano Starter (R$ 490/mês, 15 contratos, 3 usuários), Plano Pro ("ilimitado, valor a definir"), Plano Enterprise ("condições a definir"). **Nada disso é o modelo real hoje.**

**Modelo real, em produção:**

| Plano | Preço/mês | Análises/mês | Usuários na equipe |
|---|---|---|---|
| Freemium | Grátis | 1 | 1 |
| Individual | R$ 199,00 | 5 | 1 |
| Escritório | R$ 499,00 | 15 | 3 |
| Jurídico | R$ 899,00 | 40 | 5 |
| Corporativo | R$ 1.749,00 | 100 | 10 |

O "Plano Starter" (R$ 490, 15 contratos, 3 usuários) é **legado**: só existe pra quem assinou antes da migração para esse modelo novo, não é mais vendido para novos clientes. Se algum cliente real ainda estiver nele, a cláusula precisa deixar isso explícito (preço mantido enquanto ativo e adimplente, igual já previa a 5.3 antiga, mas agora comparando com o modelo novo).

As cláusulas 5.3 e 5.4 (trava de preço do MVP pro Starter, desconto de migração Starter para Pro) não fazem mais sentido como estão, já que não existe mais um único "Plano Pro" para migrar.

Todos os limites (análises por mês, usuários por equipe) são aplicados tecnicamente, tanto no momento em que o cliente tenta usar o recurso quanto na confirmação do servidor, e não só descritos no texto. Vale a cláusula deixar claro que o limite é técnico e automático, não uma política de boa fé.

### Cláusulas novas necessárias (hoje ausentes dos Termos)

1. **Forma de pagamento e cobrança recorrente.** O pagamento é processado pelo Mercado Pago, via cartão de crédito com cobrança automática recorrente ou Pix. A Ponderum não armazena dados de cartão, que ficam tokenizados no Mercado Pago.

2. **O que acontece se o pagamento falhar (recuperação de cobrança).** Ao recusar o cartão, a assinatura entra em carência de 7 dias com acesso mantido, com aviso no app e e-mails (no dia da recusa, no 3º e no 6º dia). Se não resolver até o fim da carência, o acesso é suspenso (dados preservados, sem exclusão). Depois de 30 dias suspensa sem regularização, a assinatura é encerrada.

3. **Cancelamento.** Botão de cancelar disponível em no máximo 2 cliques (exigência do Decreto 11.034/2022). Ao cancelar, o cliente mantém acesso até o fim do período já pago, sem estorno, **exceto** o direito de arrependimento do art. 49 do CDC: pessoa física (CPF) que cancelar dentro de 7 dias da primeira contratação tem direito a estorno integral automático. **Importante:** a política de reembolso para CNPJ (ou reembolso proporcional em qualquer caso) ainda não foi definida, então não prometer isso no texto até a decisão ser tomada (ver seção 5 abaixo).

4. **Troca de plano.** Upgrade (plano mais caro) vale imediatamente. Downgrade (plano mais barato) só passa a valer na próxima renovação; até lá, o cliente continua no plano atual, pagando o valor atual.

5. **Contestação de pagamento (chargeback).** Se o cliente ou o banco contestar uma cobrança ("não fui eu"), o acesso é suspenso enquanto a contestação está em aberto, e a organização fica impedida de reassinar com cartão (só Pix) até a equipe Ponderum liberar manualmente. Existe um limite de tentativas de pagamento recusadas por organização e por IP, para conter fraude.

6. **Nota fiscal.** **Atenção:** a emissão de nota fiscal de serviço (NFS-e) ainda não está em produção real. Hoje funciona em modo de simulação interna, aguardando a escolha do provedor de NFS-e e dados fiscais definitivos (código de serviço, alíquota de ISS, regime tributário), que dependem do contador da GVF. **Não prometer "nota fiscal emitida automaticamente" no termo até isso ser decidido e ativado de verdade.** Se quiser mencionar, deixar claro que é "quando aplicável" ou "a emissão poderá ser manual durante o período inicial".

7. **Convite e limite de membros da equipe.** Cada plano pago tem um limite de usuários por organização (ver tabela acima), aplicado automaticamente. O Administrador convida um novo membro por um link de convite, válido por 14 dias e cancelável a qualquer momento antes do aceite. Se a organização já estiver no limite de usuários do plano (contando também convites pendentes), o convite é recusado e o Administrador é orientado a fazer upgrade. Vale complementar a Cláusula 4.2, que hoje só diz "pode conter múltiplos Usuários" sem número nem mecanismo.

8. **Aviso de limite de análises atingido.** Quando a organização atinge o limite de análises do mês, a Plataforma informa isso de forma clara no momento da tentativa de envio de um novo contrato, incluindo a data em que o limite é renovado e um atalho direto para upgrade de plano. Complementa a Cláusula 5.6, que já previa a suspensão técnica de novas análises até a renovação ou upgrade, agora deixando explícito que o aviso é imediato e não um erro genérico.

---

## 3. POLÍTICA DE PRIVACIDADE - o que precisa mudar

### Seção 4 (Operadores) - adicionar o Mercado Pago à tabela

| Serviço | Empresa | Finalidade | Dados acessados |
|---|---|---|---|
| Mercado Pago | Mercado Pago (Mercado Livre), Brasil | Processamento de pagamentos (cartão de crédito recorrente e Pix), armazenamento tokenizado de dados de cartão | Nome/razão social, CPF ou CNPJ, e-mail de cobrança, endereço, dados do cartão (tokenizados, nunca acessados em texto puro pela Ponderum) |

Diferente dos outros operadores da tabela atual (todos nos EUA), o Mercado Pago é brasileiro. Vale mencionar isso, já que simplifica a seção de transferência internacional: esse operador específico não transfere dado pra fora do país.

### Seção 4 - detalhar o uso do Resend para e-mails do módulo de pagamentos

O Resend já consta na tabela de operadores para "envio de e-mails transacionais". Vale detalhar que, especificamente para pagamentos, os e-mails automáticos cobrem: confirmação de pagamento, aviso de cobrança recusada, troca de plano, confirmação de cancelamento e alerta interno de contestação (chargeback, enviado só para a equipe Ponderum, não para o cliente).

Um caso novo que merece nota própria: o **convite de equipe** envia e-mail para o endereço de uma pessoa que ainda **não tem conta** na Plataforma (nome e e-mail informados pelo Administrador que está convidando). Esse dado (e-mail do convidado, papel que terá na organização) fica guardado por até 14 dias, prazo de validade do convite, e é apagado se o convite for cancelado pelo Administrador ou simplesmente expirar sem uso. Isso é um tratamento de dado pessoal de alguém que ainda não é Usuário da Plataforma, então vale uma linha própria na Política explicando essa finalidade e a base legal (legítimo interesse do Administrador em formar sua equipe, ou execução de um contrato em formação).

### Seção 2 (Dados Pessoais Coletados) - novo item

Acrescentar um "2.5 Dados de faturamento e pagamento": nome/razão social, CPF ou CNPJ, endereço de cobrança, e-mail de cobrança, histórico de assinatura e pagamentos (valores, datas, status), coletados no momento da contratação de um plano pago.

### Seção 3 (Finalidades) - novas linhas na tabela

- "Processamento de pagamentos e cobrança recorrente da assinatura": base legal, execução de contrato (art. 7º, V).
- "Convite e gestão de membros da equipe, incluindo o e-mail de quem ainda não é Usuário": base legal, legítimo interesse (art. 7º, IX) ou execução de contrato em formação, a definir qual se encaixa melhor.

### Seção 7 (Retenção) - ressalva fiscal

Dados de faturamento e notas fiscais têm prazo de guarda mínimo definido por legislação fiscal/tributária (em geral 5 anos, a confirmar com o contador da GVF), diferente do restante dos dados, que são excluídos imediatamente ao encerrar a conta. Vale acrescentar essa ressalva na 7.3/7.4, para não prometer exclusão imediata de dado que por lei precisa ficar guardado.

---

## 4. Testado e funcionando, sem mudança de regra (não precisa de cláusula nova, só confere se o texto já cobre)

- **Limite de análises por plano**: testado ao vivo nos 5 planos (Freemium e os 4 pagos), bloqueio correto tanto no aviso imediato quanto na confirmação do servidor. O número de cada plano já está na tabela da seção 2 acima.
- **Limite de usuários por equipe**: testado ao vivo, incluindo o caso de tentar convidar além do limite do plano contratado.

---

## 5. Decisões que ainda estão em aberto (não é possível fechar o termo sem elas)

Essas eu não implementei ainda porque dependem de decisão de negócio ou contábil, não técnica. Melhor o Fellipe saber que existem antes de redigir, pra não fechar uma cláusula que a gente ainda vai ter que mudar:

1. **Reembolso para CNPJ / reembolso proporcional**: hoje só existe estorno automático pra CPF dentro de 7 dias (CDC). Não há regra nenhuma pra CNPJ nem pra reembolso proporcional em qualquer cancelamento.
2. **Provedor de NFS-e**: depende do contador (provedor, código de serviço LC 116, alíquota ISS, regime tributário da GVF). Enquanto isso, nota fiscal é simulada internamente.
3. **Plano anual**: não existe ainda, só cobrança mensal.
4. **Trial com prazo**: existe um campo `trial_ends_at` no banco mas ele não é usado em lugar nenhum hoje; o Freemium não expira.

---

*Preparado por Vitor (Dev) para uso do Fellipe na atualização dos Termos de Uso e Política de Privacidade do Ponderum, refletindo o Módulo de Pagamentos implementado nesta sessão.*
