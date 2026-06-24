export type ClauseItem = { heading: string; body: string }

type FormFields = {
  partyA: string
  cnpjA?: string
  cityA?: string
  partyB: string
  cnpjB?: string
  cityB?: string
  value: string
  term: string
  sector: string
  foro?: string
  notes: string
}

function v(form: FormFields) {
  return {
    a: form.partyA || 'CONTRATANTE',
    b: form.partyB || 'CONTRATADO',
    valor: form.value ? `R$ ${form.value}` : '[VALOR A SER DEFINIDO]',
    prazo: form.term || '12 (doze) meses',
    setor: form.sector || 'serviços',
    foro: form.foro?.trim() || (form.cityA?.trim() ? form.cityA.trim() : '[cidade/estado]'),
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// PRESTAÇÃO DE SERVIÇOS
// ──────────────────────────────────────────────────────────────────────────────
function clausesServicos(form: FormFields): ClauseItem[] {
  const { a, b, valor, prazo, foro } = v(form)
  return [
    {
      heading: 'Cláusula 1ª — Do Objeto',
      body: `O presente Contrato tem por objeto a prestação de serviços profissionais de ${form.sector || 'assessoria e suporte técnico'} por parte de ${b} (doravante CONTRATADA) em favor de ${a} (doravante CONTRATANTE), nas condições aqui estabelecidas.`,
    },
    {
      heading: 'Cláusula 2ª — Das Obrigações da Contratada',
      body: `A CONTRATADA obriga-se a: (i) executar os serviços com diligência, profissionalismo e dentro dos prazos acordados; (ii) disponibilizar profissionais habilitados para a execução; (iii) comunicar imediatamente qualquer impedimento que possa comprometer os prazos ou a qualidade dos serviços; (iv) guardar sigilo sobre as informações da CONTRATANTE.`,
    },
    {
      heading: 'Cláusula 3ª — Das Obrigações da Contratante',
      body: `A CONTRATANTE obriga-se a: (i) fornecer todas as informações e subsídios necessários à execução dos serviços; (ii) efetuar os pagamentos nos prazos estabelecidos; (iii) designar interlocutor responsável para acompanhamento; (iv) não interferir indevidamente na forma de execução dos serviços.`,
    },
    {
      heading: 'Cláusula 4ª — Do Valor e Forma de Pagamento',
      body: `Pela execução dos serviços, a CONTRATANTE pagará à CONTRATADA o valor total de ${valor}, a ser pago conforme cronograma acordado. O pagamento será realizado em até 30 (trinta) dias após a emissão de cada nota fiscal. O atraso no pagamento sujeitará a CONTRATANTE à multa de 2% (dois por cento) e juros de mora de 1% (um por cento) ao mês, calculados pro rata die, com atualização pelo IPCA.`,
    },
    {
      heading: 'Cláusula 5ª — Do Prazo de Vigência',
      body: `O presente Contrato terá vigência de ${prazo}, a contar da data de assinatura, podendo ser renovado automaticamente por igual período, salvo manifestação contrária de qualquer das partes por escrito, com antecedência mínima de 30 (trinta) dias.`,
    },
    {
      heading: 'Cláusula 6ª — Da Propriedade Intelectual',
      body: `Os entregáveis, relatórios e demais obras produzidas especificamente para a CONTRATANTE em razão deste Contrato serão de propriedade exclusiva da CONTRATANTE após integral pagamento. As ferramentas, metodologias e propriedade intelectual pré-existentes da CONTRATADA permanecem de sua titularidade exclusiva.`,
    },
    {
      heading: 'Cláusula 7ª — Da Confidencialidade',
      body: `As partes comprometem-se a manter sigilo absoluto sobre todas as informações confidenciais obtidas em razão deste Contrato, pelo prazo de 2 (dois) anos após seu término. Excetuam-se as informações já de domínio público e as cuja divulgação seja determinada por autoridade judicial ou administrativa competente.`,
    },
    {
      heading: 'Cláusula 8ª — Das Penalidades e Responsabilidade',
      body: `O descumprimento de qualquer cláusula deste Contrato sujeitará a parte infratora ao pagamento de multa de 10% (dez por cento) sobre o valor total do Contrato, sem prejuízo de perdas e danos efetivamente comprovados. A responsabilidade total de cada parte fica limitada ao montante pago nos últimos 12 (doze) meses, excluídos danos indiretos e lucros cessantes.`,
    },
    {
      heading: 'Cláusula 9ª — Da Rescisão',
      body: `Qualquer das partes poderá rescindir este Contrato sem justa causa mediante aviso prévio escrito de 30 (trinta) dias, sem ônus adicionais além dos serviços já prestados. A rescisão por justa causa, comprovada mediante notificação com prazo de 15 dias para cura, dispensa aviso prévio.`,
    },
    {
      heading: 'Cláusula 10ª — Das Disposições Gerais e Foro',
      body: `O presente Contrato é regido pelas leis brasileiras, em especial pelo Código Civil (Lei n.º 10.406/2002). As partes elegem o foro da Comarca de ${foro}, com exclusão de qualquer outro, para dirimir controvérsias oriundas deste instrumento. Eventuais alterações somente terão validade se pactuadas por escrito e assinadas por ambas as partes.`,
    },
  ]
}

// ──────────────────────────────────────────────────────────────────────────────
// NDA — ACORDO DE CONFIDENCIALIDADE
// ──────────────────────────────────────────────────────────────────────────────
function clausesNda(form: FormFields): ClauseItem[] {
  const { a, b, prazo, foro } = v(form)
  return [
    {
      heading: 'Cláusula 1ª — Do Objeto',
      body: `O presente Acordo tem por objeto estabelecer as condições de sigilo e confidencialidade entre ${a} e ${b} (doravante conjuntamente denominadas "Partes"), no contexto de ${form.sector || 'negociações e projetos em comum'}, visando proteger as informações confidenciais eventualmente trocadas entre si.`,
    },
    {
      heading: 'Cláusula 2ª — Da Definição de Informações Confidenciais',
      body: `Consideram-se confidenciais todas as informações técnicas, comerciais, financeiras, estratégicas, operacionais ou de qualquer outra natureza, divulgadas por uma Parte à outra, oralmente ou por escrito, inclusive em formato eletrônico, identificadas ou razoavelmente identificáveis como confidenciais pelo contexto de sua divulgação.`,
    },
    {
      heading: 'Cláusula 3ª — Das Obrigações de Confidencialidade',
      body: `Cada Parte obriga-se a: (i) manter em absoluto sigilo as Informações Confidenciais recebidas; (ii) utilizá-las exclusivamente para os fins deste Acordo; (iii) restringir o acesso a colaboradores com necessidade justificada, vinculados por obrigação de sigilo equivalente; (iv) comunicar imediatamente a outra Parte qualquer suspeita de violação.`,
    },
    {
      heading: 'Cláusula 4ª — Das Exceções',
      body: `As obrigações de sigilo não se aplicam às informações que: (i) já sejam de domínio público na data da divulgação ou venham a ser, sem culpa da Parte receptora; (ii) sejam legitimamente conhecidas pela Parte receptora antes da divulgação; (iii) sejam obtidas de terceiros sem restrições; (iv) cuja divulgação seja exigida por lei, regulamento ou ordem judicial, devendo a Parte notificar a outra imediatamente.`,
    },
    {
      heading: 'Cláusula 5ª — Do Prazo',
      body: `O presente Acordo terá vigência de ${prazo} a contar da data de assinatura. As obrigações de confidencialidade relativas a informações recebidas durante a vigência permanecerão em plena eficácia pelo prazo de 3 (três) anos após o término deste instrumento.`,
    },
    {
      heading: 'Cláusula 6ª — Da Devolução e Destruição de Informações',
      body: `Ao término deste Acordo ou quando solicitado pela Parte divulgadora, a Parte receptora deverá devolver ou destruir, a critério da divulgadora, todos os documentos e registros contendo Informações Confidenciais, fornecendo confirmação por escrito de que cumpriu esta obrigação.`,
    },
    {
      heading: 'Cláusula 7ª — Das Penalidades',
      body: `A violação de qualquer obrigação prevista neste Acordo sujeitará a Parte infratora ao pagamento de multa de R$ 50.000,00 (cinquenta mil reais) por violação comprovada, sem prejuízo de perdas e danos adicionais e de medidas cautelares cabíveis. A indisponibilidade de provar dano material não afasta a multa.`,
    },
    {
      heading: 'Cláusula 8ª — Das Disposições Gerais e Foro',
      body: `Este Acordo é regido pelo ordenamento jurídico brasileiro. As Partes elegem o foro da Comarca de ${foro} para dirimir quaisquer litígios decorrentes deste instrumento. Este Acordo não implica criação de vínculo societário, empregatício ou de qualquer outra natureza entre as Partes.`,
    },
  ]
}

// ──────────────────────────────────────────────────────────────────────────────
// FORNECIMENTO DE PRODUTOS
// ──────────────────────────────────────────────────────────────────────────────
function clausesFornecimento(form: FormFields): ClauseItem[] {
  const { a, b, valor, prazo, foro } = v(form)
  return [
    {
      heading: 'Cláusula 1ª — Do Objeto',
      body: `O presente Contrato tem por objeto o fornecimento de produtos/materiais de ${form.sector || '[tipo de produto]'} por parte de ${b} (doravante FORNECEDORA) em favor de ${a} (doravante COMPRADORA), nas quantidades, especificações técnicas e condições estabelecidas neste instrumento e em seus Anexos.`,
    },
    {
      heading: 'Cláusula 2ª — Das Condições de Entrega',
      body: `A FORNECEDORA deverá entregar os produtos no local indicado pela COMPRADORA, no prazo acordado em cada ordem de compra, acompanhados de nota fiscal, certificados de qualidade e demais documentos exigidos. A entrega apenas se considera concluída após inspeção e aceite formal da COMPRADORA.`,
    },
    {
      heading: 'Cláusula 3ª — Da Qualidade e Especificações',
      body: `Os produtos deverão estar em conformidade com as especificações técnicas acordadas, livre de defeitos de fabricação ou vícios de qualidade. A FORNECEDORA garante que os produtos estão em conformidade com as normas técnicas aplicáveis (ABNT e demais normas regulamentares) e com a legislação vigente.`,
    },
    {
      heading: 'Cláusula 4ª — Do Preço e Forma de Pagamento',
      body: `O valor total estimado do fornecimento é de ${valor}. O pagamento será efetuado em até 30 (trinta) dias após o aceite formal de cada entrega, mediante apresentação de nota fiscal. Reajustes anuais serão realizados pelo IPCA acumulado dos últimos 12 meses, limitados a 8% (oito por cento) ao ano.`,
    },
    {
      heading: 'Cláusula 5ª — Da Vigência',
      body: `O presente Contrato terá vigência de ${prazo}, renovável automaticamente por iguais períodos, salvo notificação de rescisão com antecedência mínima de 60 (sessenta) dias.`,
    },
    {
      heading: 'Cláusula 6ª — Da Não-Conformidade e Devolução',
      body: `Produtos entregues em não-conformidade com as especificações serão devolvidos à FORNECEDORA dentro de 10 (dez) dias úteis do aceite provisório. A FORNECEDORA deverá substituir os produtos rejeitados em até 15 (quinze) dias, sem custo adicional para a COMPRADORA. O prazo de pagamento ficará suspenso até a substituição.`,
    },
    {
      heading: 'Cláusula 7ª — Das Garantias',
      body: `A FORNECEDORA garante os produtos pelo prazo mínimo estabelecido pelo Código de Defesa do Consumidor (Lei n.º 8.078/1990) e, quando aplicável, pelo fabricante. A garantia contratual é de 12 (doze) meses a contar do aceite formal, cobrindo defeitos de fabricação e vícios ocultos.`,
    },
    {
      heading: 'Cláusula 8ª — Das Penalidades e Rescisão',
      body: `O atraso na entrega injustificado sujeitará a FORNECEDORA a multa de 0,5% (zero vírgula cinco por cento) do valor do pedido por dia de atraso, limitada a 10% (dez por cento). Qualquer das partes poderá rescindir este Contrato por justa causa, mediante notificação escrita com prazo de 15 dias para cura do inadimplemento.`,
    },
    {
      heading: 'Cláusula 9ª — Das Disposições Gerais e Foro',
      body: `O presente Contrato é regido pelo Código Civil Brasileiro e pelo Código de Defesa do Consumidor, quando aplicável. As partes elegem o foro da Comarca de ${foro} para dirimir eventuais litígios.`,
    },
  ]
}

// ──────────────────────────────────────────────────────────────────────────────
// LICENCIAMENTO SAAS
// ──────────────────────────────────────────────────────────────────────────────
function clausesLicenca(form: FormFields): ClauseItem[] {
  const { a, b, valor, prazo, foro } = v(form)
  return [
    {
      heading: 'Cláusula 1ª — Da Licença',
      body: `${b} (doravante LICENCIANTE) concede a ${a} (doravante LICENCIADA) licença de uso não exclusiva, intransferível e revogável do software/plataforma SaaS de ${form.sector || 'gestão e automação'}, exclusivamente para uso interno da LICENCIADA, nos termos e condições deste Contrato.`,
    },
    {
      heading: 'Cláusula 2ª — Do Escopo de Uso e Restrições',
      body: `A licença abrange os módulos e funcionalidades descritos no plano contratado. É expressamente vedado à LICENCIADA: (i) sublicenciar, ceder ou transferir o acesso a terceiros; (ii) efetuar engenharia reversa ou modificar o código-fonte; (iii) utilizar o software para fins ilegais ou contrários à boa-fé; (iv) remover marcas, avisos de direitos autorais ou de propriedade intelectual.`,
    },
    {
      heading: 'Cláusula 3ª — Do Nível de Serviço (SLA)',
      body: `A LICENCIANTE garante disponibilidade mínima de 99,5% (noventa e nove vírgula cinco por cento) mensal, excluídas janelas de manutenção programada (notificadas com mínimo de 48 horas de antecedência). Em caso de indisponibilidade superior ao SLA contratado, a LICENCIADA fará jus a créditos equivalentes ao tempo excedente, a ser aplicado na próxima fatura.`,
    },
    {
      heading: 'Cláusula 4ª — Do Suporte Técnico',
      body: `A LICENCIANTE disponibilizará suporte técnico em dias úteis, das 9h às 18h (horário de Brasília), pelos canais de atendimento acordados. O prazo de resposta para incidentes críticos é de 4 (quatro) horas; para incidentes de alta severidade, 1 (um) dia útil; demais incidentes, 3 (três) dias úteis.`,
    },
    {
      heading: 'Cláusula 5ª — Do Valor e Forma de Pagamento',
      body: `O valor da licença é de ${valor}, pago mensalmente/anualmente conforme plano contratado, com vencimento no dia acordado. O atraso no pagamento por mais de 5 (cinco) dias corridos poderá resultar na suspensão temporária do acesso, sem prejuízo da cobrança de multa de 2% e juros de 1% a.m.`,
    },
    {
      heading: 'Cláusula 6ª — Da Proteção de Dados Pessoais (LGPD)',
      body: `As partes comprometem-se a cumprir integralmente a Lei Geral de Proteção de Dados (Lei n.º 13.709/2018). A LICENCIANTE atuará como Operadora dos dados inseridos pela LICENCIADA (Controladora), processando-os exclusivamente para a prestação do serviço. A LICENCIANTE adota medidas técnicas e organizacionais adequadas para proteção dos dados pessoais.`,
    },
    {
      heading: 'Cláusula 7ª — Da Propriedade Intelectual e dos Dados',
      body: `O software, sua interface, documentação e tecnologia subjacente são de propriedade exclusiva da LICENCIANTE, protegidos por direitos autorais e de propriedade industrial. Os dados inseridos pela LICENCIADA são de sua propriedade exclusiva; a LICENCIANTE garante exportação dos dados em formato aberto em caso de rescisão, dentro de 30 dias.`,
    },
    {
      heading: 'Cláusula 8ª — Da Vigência e Renovação',
      body: `O presente Contrato terá vigência de ${prazo}, renovando-se automaticamente por iguais períodos. A não renovação deverá ser comunicada por escrito com, no mínimo, 30 (trinta) dias de antecedência.`,
    },
    {
      heading: 'Cláusula 9ª — Da Rescisão',
      body: `Qualquer das partes poderá rescindir este Contrato por justa causa, mediante notificação escrita, concedendo prazo de 15 (quinze) dias para cura do inadimplemento. A LICENCIADA poderá rescindir sem justa causa com aviso prévio de 30 dias. Em qualquer hipótese, valores pagos antecipadamente serão reembolsados pro rata.`,
    },
    {
      heading: 'Cláusula 10ª — Das Disposições Gerais e Foro',
      body: `Este Contrato é regido pela legislação brasileira, especialmente o Código Civil (Lei n.º 10.406/2002), a Lei de Direitos Autorais (Lei n.º 9.610/1998) e a LGPD. As partes elegem o foro da Comarca de ${foro} para dirimir controvérsias.`,
    },
  ]
}

// ──────────────────────────────────────────────────────────────────────────────
// PARCERIA COMERCIAL
// ──────────────────────────────────────────────────────────────────────────────
function clausesParceria(form: FormFields): ClauseItem[] {
  const { a, b, prazo, foro } = v(form)
  return [
    {
      heading: 'Cláusula 1ª — Do Objeto e da Parceria',
      body: `O presente Contrato estabelece os termos da parceria comercial estratégica entre ${a} e ${b} (doravante "Parceiros"), para ${form.sector || 'atuação conjunta em projetos comerciais e captação de clientes'}, visando o aproveitamento das competências complementares de cada Parceiro.`,
    },
    {
      heading: 'Cláusula 2ª — Das Obrigações de Cada Parceiro',
      body: `${a} será responsável por: [descrever contribuições da Parte A]. ${b} será responsável por: [descrever contribuições da Parte B]. Cada Parceiro atuará de forma independente, arcando com seus próprios custos operacionais, salvo acordos específicos firmados entre si.`,
    },
    {
      heading: 'Cláusula 3ª — Da Divisão de Receitas',
      body: `As receitas provenientes dos negócios gerados em razão desta parceria serão divididas conforme acordado em cada projeto específico, formalizado em Ordem de Serviço ou Adendo assinado pelas Partes. Na ausência de acordo específico, aplica-se a divisão de 50% (cinquenta por cento) para cada Parceiro.`,
    },
    {
      heading: 'Cláusula 4ª — Da Exclusividade',
      body: `Esta parceria não é exclusiva, salvo disposição expressa em contrário em Adendo específico. Cada Parceiro mantém plena liberdade para celebrar parcerias com outros agentes de mercado, desde que não conflitem com negócios em andamento desta parceria.`,
    },
    {
      heading: 'Cláusula 5ª — Das Metas e Desempenho',
      body: `As metas de desempenho desta parceria serão definidas de comum acordo e revisadas trimestralmente, formalizadas em Adendo. O não atingimento de metas por dois trimestres consecutivos, sem justificativa aceita por ambas as Partes, poderá ensejar revisão dos termos ou rescisão amigável.`,
    },
    {
      heading: 'Cláusula 6ª — Da Confidencialidade',
      body: `Cada Parceiro obriga-se a manter sigilo absoluto sobre as informações estratégicas, comerciais e financeiras do outro Parceiro, bem como sobre os termos desta parceria, durante a vigência e por 2 (dois) anos após seu término. Excetuam-se as informações que se tornem de domínio público sem culpa das Partes.`,
    },
    {
      heading: 'Cláusula 7ª — Do Prazo de Vigência',
      body: `O presente Contrato terá vigência de ${prazo} a contar da data de assinatura, renovável mediante acordo expresso das Partes. A denúncia unilateral poderá ser realizada com aviso prévio de 60 (sessenta) dias, sem prejuízo dos projetos em andamento, que serão concluídos nos termos pactuados.`,
    },
    {
      heading: 'Cláusula 8ª — Da Independência das Partes',
      body: `Esta parceria não cria entre os Parceiros qualquer vínculo de sociedade, associação, mandato, representação comercial ou relação empregatícia. Cada Parceiro é responsável por suas próprias obrigações trabalhistas, tributárias e previdenciárias.`,
    },
    {
      heading: 'Cláusula 9ª — Das Disposições Gerais e Foro',
      body: `Este instrumento é regido pelas leis brasileiras. Os Parceiros elegem o foro da Comarca de ${foro} para dirimir controvérsias, renunciando a qualquer outro foro, por mais privilegiado que seja.`,
    },
  ]
}

// ──────────────────────────────────────────────────────────────────────────────
// CONSULTORIA
// ──────────────────────────────────────────────────────────────────────────────
function clausesConsultoria(form: FormFields): ClauseItem[] {
  const { a, b, valor, prazo, foro } = v(form)
  return [
    {
      heading: 'Cláusula 1ª — Do Objeto e dos Entregáveis',
      body: `O presente Contrato tem por objeto a prestação de serviços especializados de consultoria em ${form.sector || 'gestão, processos e estratégia'} por parte de ${b} (CONSULTORA) em favor de ${a} (CLIENTE). Os entregáveis e o escopo detalhado constam do Anexo Técnico, parte integrante deste instrumento.`,
    },
    {
      heading: 'Cláusula 2ª — Da Metodologia e Forma de Execução',
      body: `A CONSULTORA definirá a metodologia de trabalho, podendo executar os serviços de forma presencial ou remota, conforme a natureza de cada entregável. A CONSULTORA possui autonomia técnica na condução dos trabalhos, devendo submeter relatórios de progresso conforme periodicidade acordada.`,
    },
    {
      heading: 'Cláusula 3ª — Das Obrigações do Cliente',
      body: `O CLIENTE obriga-se a: (i) fornecer acesso às informações, sistemas e colaboradores necessários; (ii) designar interlocutor com poderes de decisão; (iii) aprovar ou rejeitar entregáveis no prazo de 5 (cinco) dias úteis, sendo o silêncio interpretado como aprovação tácita; (iv) efetuar os pagamentos nos prazos acordados.`,
    },
    {
      heading: 'Cláusula 4ª — Dos Honorários e Milestones',
      body: `Os honorários totais são de ${valor}, pagos conforme o seguinte cronograma de milestones: (i) 30% na assinatura; (ii) 40% na entrega do diagnóstico ou meio do projeto; (iii) 30% na entrega final aprovada. Os honorários cobrem exclusivamente o escopo definido; trabalhos adicionais serão orçados separadamente.`,
    },
    {
      heading: 'Cláusula 5ª — Das Despesas Reembolsáveis',
      body: `Despesas de viagem, hospedagem e deslocamento, quando necessárias à execução dos serviços e previamente aprovadas pelo CLIENTE, serão reembolsadas mediante apresentação de comprovantes. A aprovação prévia de despesas acima de R$ 500,00 é condição para reembolso.`,
    },
    {
      heading: 'Cláusula 6ª — Da Propriedade Intelectual',
      body: `Os relatórios, diagnósticos e entregáveis produzidos especificamente para o CLIENTE serão de sua propriedade após integral pagamento. A CONSULTORA reserva-se o direito de utilizar as metodologias, frameworks e conhecimentos genéricos desenvolvidos ou empregados durante a prestação dos serviços em outros projetos.`,
    },
    {
      heading: 'Cláusula 7ª — Da Confidencialidade e Não-Concorrência',
      body: `A CONSULTORA compromete-se a manter sigilo sobre as informações estratégicas do CLIENTE por 3 (três) anos após o término deste Contrato. Durante a vigência, a CONSULTORA abstém-se de prestar serviços a concorrentes diretos do CLIENTE na mesma área geográfica, salvo autorização expressa por escrito.`,
    },
    {
      heading: 'Cláusula 8ª — Do Prazo e da Rescisão',
      body: `O presente Contrato terá vigência de ${prazo}. O CLIENTE poderá rescindir este Contrato sem justa causa mediante aviso prévio de 15 (quinze) dias, ficando obrigado ao pagamento dos trabalhos realizados até a data de rescisão, acrescidos de 20% sobre o valor remanescente a título de compensação.`,
    },
    {
      heading: 'Cláusula 9ª — Das Disposições Gerais e Foro',
      body: `Este Contrato é regido pelas leis brasileiras. As partes elegem o foro da Comarca de ${foro} para dirimir quaisquer controvérsias, com renúncia expressa a qualquer outro foro.`,
    },
  ]
}

// ──────────────────────────────────────────────────────────────────────────────
// Dispatcher
// ──────────────────────────────────────────────────────────────────────────────
export function getTemplateClauses(tplId: string, form: FormFields): ClauseItem[] {
  switch (tplId) {
    case 'nda': return clausesNda(form)
    case 'fornecimento': return clausesFornecimento(form)
    case 'licenca': return clausesLicenca(form)
    case 'parceria': return clausesParceria(form)
    case 'consultoria': return clausesConsultoria(form)
    default: return clausesServicos(form)
  }
}

export const DISCLAIMER =
  'AVISO LEGAL: Este contrato foi gerado pelo SOJ com base em modelos padrão de mercado. Recomendamos revisão por advogado habilitado antes da assinatura. O SOJ não se responsabiliza por decisões tomadas com base neste documento sem orientação jurídica profissional.'
