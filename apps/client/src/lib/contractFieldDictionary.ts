// Dicionário de label/tipo/grupo para os campos {{CAMPO}} da Biblioteca de 54
// Modelos. Construído por heurística de nome a partir de campos_parametrizaveis.csv
// (revisão-base 25/07/2026) — cobre os 55 campos usados pelos 9 modelos de
// Prestação de Serviços (14 universais, reaproveitáveis por qualquer categoria
// futura, + 41 específicos desta categoria).
//
// "party-select"/"lgpd-role-select" não têm opções fixas aqui: são resolvidas em
// runtime a partir do parteA/parteB do modelo selecionado (ver
// resolvePartySelectOptions), porque o rótulo de cada parte muda por modelo
// (ex: CONTRATANTE/CONTRATADA em PS-01, CLIENTE/DESENVOLVEDORA em PS-04).

export type ContractFieldType =
  | "text"
  | "textarea"
  | "date"
  | "money"
  | "document"
  | "party-select"
  | "lgpd-role-select";

export type ContractFieldGroup =
  | "partes"
  | "objeto_escopo"
  | "comercial"
  | "sla_aceite"
  | "dados_lgpd"
  | "responsabilidade"
  | "confidencialidade"
  | "controversias"
  | "produto_logistica"
  | "parceria"
  | "consultoria"
  | "assinatura";

export type ContractFieldDef = {
  label: string;
  type: ContractFieldType;
  group: ContractFieldGroup;
  placeholder?: string;
};

export const LGPD_ROLE_OPTIONS = ["Controladora", "Operadora", "Controladores conjuntos"] as const;

export const CONTRACT_FIELD_DICTIONARY: Record<string, ContractFieldDef> = {
  // Partes — universal (14 campos, presentes em todos os 54 modelos)
  PARTE_A_RAZAO_SOCIAL: { label: "Razão social da Parte A", type: "text", group: "partes" },
  PARTE_A_CNPJ: { label: "CNPJ/CPF da Parte A", type: "document", group: "partes" },
  PARTE_A_ENDERECO: { label: "Endereço da Parte A", type: "text", group: "partes", placeholder: "Rua, número, bairro, cidade/UF" },
  PARTE_B_RAZAO_SOCIAL: { label: "Razão social da Parte B", type: "text", group: "partes" },
  PARTE_B_CNPJ: { label: "CNPJ/CPF da Parte B", type: "document", group: "partes" },
  PARTE_B_ENDERECO: { label: "Endereço da Parte B", type: "text", group: "partes", placeholder: "Rua, número, bairro, cidade/UF" },
  VIGENCIA: { label: "Vigência do contrato", type: "text", group: "objeto_escopo", placeholder: "Ex: 12 meses, prazo indeterminado..." },
  LOCAL_ASSINATURA: { label: "Local de assinatura", type: "text", group: "assinatura" },
  DATA_ASSINATURA: { label: "Data de assinatura", type: "date", group: "assinatura" },
  TESTEMUNHA_1_NOME: { label: "Testemunha 1 — nome", type: "text", group: "assinatura" },
  TESTEMUNHA_1_CPF: { label: "Testemunha 1 — CPF", type: "document", group: "assinatura" },
  TESTEMUNHA_2_NOME: { label: "Testemunha 2 — nome", type: "text", group: "assinatura" },
  TESTEMUNHA_2_CPF: { label: "Testemunha 2 — CPF", type: "document", group: "assinatura" },

  // Objeto e escopo
  OBJETO_RESUMIDO: { label: "Objeto resumido do contrato", type: "textarea", group: "objeto_escopo" },
  ESCOPO_DETALHADO: { label: "Escopo detalhado dos serviços", type: "textarea", group: "objeto_escopo" },
  EXCLUSOES: { label: "Exclusões do escopo", type: "textarea", group: "objeto_escopo" },
  DEPENDENCIAS: { label: "Dependências do cliente/contratante", type: "textarea", group: "objeto_escopo" },
  PROFISSIONAIS_CHAVE: { label: "Profissionais-chave", type: "textarea", group: "objeto_escopo" },
  PRAZO: { label: "Prazo do escopo principal", type: "text", group: "objeto_escopo", placeholder: "Ex: 90 dias corridos" },
  DATA: { label: "Data limite das dependências", type: "date", group: "objeto_escopo" },
  PARTE: { label: "Responsável pelos profissionais-chave", type: "party-select", group: "objeto_escopo" },
  RESPONSAVEL: { label: "Responsável pelo item", type: "party-select", group: "objeto_escopo" },
  RESPONSAVEL_DEPENDENCIA: { label: "Responsável pelas dependências", type: "party-select", group: "objeto_escopo" },

  // Módulos, implantação e integrações (Licenciamento SaaS)
  MODULOS_E_USUARIOS: { label: "Módulos e usuários licenciados", type: "textarea", group: "objeto_escopo" },
  MODULOS: { label: "Módulos contratados", type: "textarea", group: "objeto_escopo" },
  USUARIOS_VOLUMES: { label: "Usuários e volumes contratados", type: "text", group: "objeto_escopo" },
  PLANO_IMPLANTACAO: { label: "Plano de implantação", type: "textarea", group: "objeto_escopo" },
  PRAZO_IMPLANTACAO: { label: "Prazo de implantação", type: "text", group: "objeto_escopo", placeholder: "Ex: 60 dias" },
  INTEGRACOES: { label: "Integrações previstas", type: "textarea", group: "objeto_escopo" },
  SERVICOS_PROFISSIONAIS: { label: "Serviços profissionais incluídos", type: "textarea", group: "objeto_escopo" },
  CRONOGRAMA: { label: "Cronograma", type: "text", group: "objeto_escopo" },

  // Comercial
  PRECO_E_FORMA_DE_PAGAMENTO: { label: "Preço e forma de pagamento", type: "textarea", group: "comercial" },
  POLITICA_DESPESAS: { label: "Política de despesas reembolsáveis", type: "textarea", group: "comercial" },
  VALOR: { label: "Valor/remuneração total", type: "money", group: "comercial" },
  MARCO_DE_FATURAMENTO: { label: "Marco de faturamento", type: "text", group: "comercial", placeholder: "Ex: mensal, por entrega, por marco" },
  PRAZO_PAGAMENTO: { label: "Prazo de pagamento", type: "text", group: "comercial", placeholder: "Ex: 30 dias da emissão da NF" },
  INDICE_E_PERIODICIDADE: { label: "Índice de reajuste e periodicidade", type: "text", group: "comercial", placeholder: "Ex: IPCA, anual" },
  INDICE_REAJUSTE: { label: "Índice de reajuste (Anexo II)", type: "text", group: "comercial", placeholder: "Ex: IPCA" },
  PRAZO_CONTESTACAO_FATURA: { label: "Prazo para contestar fatura (dias úteis)", type: "text", group: "comercial", placeholder: "Ex: 5" },
  PRECO_IMPLANTACAO: { label: "Preço da implantação", type: "money", group: "comercial" },
  VIGENCIA_RENOVACAO: { label: "Prazo e regra de renovação", type: "text", group: "comercial", placeholder: "Ex: 12 meses, renovação automática" },

  // SLA e aceite
  SLA_E_ACEITE: { label: "SLA e critérios de aceite (resumo)", type: "textarea", group: "sla_aceite" },
  CRITERIO_ACEITE: { label: "Critério de aceite das entregas", type: "textarea", group: "sla_aceite" },
  META_RESPOSTA: { label: "Meta de tempo de resposta", type: "text", group: "sla_aceite", placeholder: "Ex: 4 horas úteis" },
  META_SOLUCAO: { label: "Meta de tempo de solução", type: "text", group: "sla_aceite", placeholder: "Ex: 24 horas úteis" },
  META_QUALIDADE: { label: "Meta de qualidade/disponibilidade", type: "text", group: "sla_aceite", placeholder: "Ex: 99,5% de disponibilidade mensal" },
  FONTE_MEDICAO: { label: "Fonte de medição dos indicadores", type: "text", group: "sla_aceite", placeholder: "Ex: sistema de tickets, relatório mensal" },
  REMEDIO: { label: "Remédio contratual por descumprimento de SLA", type: "text", group: "sla_aceite", placeholder: "Ex: crédito de serviço proporcional" },
  META_DISPONIBILIDADE: { label: "Meta de disponibilidade (SLA)", type: "text", group: "sla_aceite", placeholder: "Ex: 99,9% mensal" },
  CREDITO: { label: "Crédito de serviço por descumprimento", type: "text", group: "sla_aceite", placeholder: "Ex: 5% da mensalidade por hora de indisponibilidade" },
  RESPOSTA_CRITICA: { label: "Meta de resposta para incidente crítico", type: "text", group: "sla_aceite", placeholder: "Ex: 1 hora" },
  SOLUCAO_CRITICA: { label: "Meta de solução para incidente crítico", type: "text", group: "sla_aceite", placeholder: "Ex: 4 horas" },
  METRICA_EXCEDENTE: { label: "Métrica e cobrança de uso excedente", type: "text", group: "sla_aceite" },
  RTO: { label: "RTO — tempo de recuperação de desastre", type: "text", group: "sla_aceite", placeholder: "Ex: 4 horas" },
  RPO: { label: "RPO — perda de dados máxima tolerável", type: "text", group: "sla_aceite", placeholder: "Ex: 15 minutos" },
  FORMATO_EXPORTACAO: { label: "Formato de exportação de dados", type: "text", group: "sla_aceite", placeholder: "Ex: CSV, JSON" },
  JANELA_EXPORTACAO: { label: "Janela de exportação pós-término (dias)", type: "text", group: "sla_aceite", placeholder: "Ex: 90" },

  // Dados pessoais / LGPD
  CATEGORIAS_DADOS: { label: "Categorias de dados pessoais tratados", type: "textarea", group: "dados_lgpd" },
  CATEGORIAS_TITULARES: { label: "Categorias de titulares dos dados", type: "textarea", group: "dados_lgpd" },
  FINALIDADES: { label: "Finalidades do tratamento de dados", type: "textarea", group: "dados_lgpd" },
  SUBOPERADORES: { label: "Suboperadores/subcontratados de dados", type: "textarea", group: "dados_lgpd" },
  PAPEIS_LGPD: { label: "Papéis LGPD (resumo do quadro)", type: "text", group: "dados_lgpd" },
  PAPEL_LGPD_PARTE_A: { label: "Papel LGPD da Parte A", type: "lgpd-role-select", group: "dados_lgpd" },
  PAPEL_LGPD_PARTE_B: { label: "Papel LGPD da Parte B", type: "lgpd-role-select", group: "dados_lgpd" },
  PRAZO_RETENCAO: { label: "Prazo de retenção de dados", type: "text", group: "dados_lgpd", placeholder: "Ex: até 5 anos após o término" },
  PRAZO_COMUNICACAO_INCIDENTE: { label: "Prazo para comunicação de incidente", type: "text", group: "dados_lgpd", placeholder: "Ex: 48 horas" },
  PAPEL_CLIENTE: { label: "Papel LGPD do Cliente", type: "lgpd-role-select", group: "dados_lgpd" },
  PAPEL_PROVEDORA: { label: "Papel LGPD da Provedora", type: "lgpd-role-select", group: "dados_lgpd" },
  DADOS_TITULARES: { label: "Dados e titulares envolvidos", type: "textarea", group: "dados_lgpd" },
  SUBPROCESSADORES: { label: "Subprocessadores", type: "textarea", group: "dados_lgpd" },
  RETENCAO: { label: "Retenção de dados", type: "text", group: "dados_lgpd", placeholder: "Ex: até 12 meses após o término" },
  CONTROLES_SEGURANCA: { label: "Controles mínimos de segurança", type: "textarea", group: "dados_lgpd" },

  // Responsabilidade e continuidade
  CAP_DE_RESPONSABILIDADE: { label: "Teto de responsabilidade", type: "text", group: "responsabilidade", placeholder: "Ex: valor pago nos últimos 12 meses" },
  SEGUROS_EXIGIDOS: { label: "Seguros exigidos", type: "textarea", group: "responsabilidade" },
  AVISO_PREVIO: { label: "Aviso prévio para rescisão", type: "text", group: "responsabilidade", placeholder: "Ex: 30 dias" },
  PRAZO_CURA: { label: "Prazo de cura do inadimplemento (dias)", type: "text", group: "responsabilidade", placeholder: "Ex: 15" },
  PRAZO_FORCA_MAIOR: { label: "Prazo máximo de força maior (dias)", type: "text", group: "responsabilidade", placeholder: "Ex: 60" },
  PRAZO_TRANSICAO: { label: "Prazo de transição pós-encerramento (dias)", type: "text", group: "responsabilidade", placeholder: "Ex: 30" },

  // Confidencialidade e controle de acesso (NDA)
  FINALIDADE_DO_NDA: { label: "Finalidade do acordo de confidencialidade", type: "textarea", group: "confidencialidade" },
  FINALIDADE: { label: "Finalidade", type: "textarea", group: "confidencialidade" },
  FINALIDADE_TECNICA: { label: "Finalidade técnica", type: "textarea", group: "confidencialidade" },
  PROJETO_OU_OPERACAO: { label: "Projeto ou operação relacionada", type: "text", group: "confidencialidade" },
  PROJETO_OU_OPORTUNIDADE: { label: "Projeto ou oportunidade avaliada", type: "text", group: "confidencialidade" },
  OPERACAO: { label: "Operação", type: "text", group: "confidencialidade" },
  OPERACAO_SOCIETARIA: { label: "Operação societária", type: "text", group: "confidencialidade", placeholder: "Ex: aquisição, fusão, reorganização" },
  PARCERIA_COMERCIAL: { label: "Parceria comercial relacionada", type: "text", group: "confidencialidade" },
  CATEGORIAS_INFORMACAO: { label: "Categorias de informações críticas", type: "textarea", group: "confidencialidade" },
  PRAZO_SIGILO: { label: "Prazo de sigilo (anos)", type: "text", group: "confidencialidade", placeholder: "Ex: 5" },
  HA_DADOS_PESSOAIS: { label: "Há dados pessoais envolvidos?", type: "text", group: "confidencialidade", placeholder: "Sim / Não" },
  PESSOAS_AUTORIZADAS: { label: "Pessoas autorizadas a acessar as informações", type: "textarea", group: "confidencialidade" },
  AMBIENTE_AUTORIZADO: { label: "Ambiente autorizado de acesso", type: "text", group: "confidencialidade", placeholder: "Ex: data room virtual, e-mail corporativo" },
  REGRA_DOWNLOAD: { label: "Regra de download/impressão", type: "text", group: "confidencialidade" },
  MEMBROS_CLEAN_TEAM: { label: "Membros do clean team", type: "textarea", group: "confidencialidade" },
  RETENCAO_LOGS: { label: "Retenção de logs de acesso", type: "text", group: "confidencialidade", placeholder: "Ex: 12 meses" },
  REGRA_CONTATO: { label: "Regra de contato externo", type: "textarea", group: "confidencialidade" },
  PRAZO_ELIMINACAO: { label: "Prazo para eliminação das informações", type: "text", group: "confidencialidade", placeholder: "Ex: 30 dias" },
  TITULARES: { label: "Titulares dos dados pessoais envolvidos", type: "textarea", group: "dados_lgpd" },
  MECANISMO_TRANSFERENCIA: { label: "Mecanismo de transferência internacional de dados", type: "text", group: "dados_lgpd" },
  PRAZO_INCIDENTE: { label: "Prazo de comunicação de incidente", type: "text", group: "dados_lgpd", placeholder: "Ex: 48 horas" },
  PRAZO_PROTECAO_LEAD: { label: "Prazo de proteção de indicação/lead", type: "text", group: "confidencialidade", placeholder: "Ex: 12 meses" },

  // Produto e logística (Fornecimento)
  PRODUTOS: { label: "Produtos fornecidos (resumo)", type: "textarea", group: "produto_logistica" },
  PRODUTO: { label: "Produto", type: "text", group: "produto_logistica" },
  CODIGO: { label: "Código do produto", type: "text", group: "produto_logistica" },
  ESPECIFICACAO: { label: "Especificação técnica", type: "textarea", group: "produto_logistica" },
  EMBALAGEM: { label: "Embalagem", type: "text", group: "produto_logistica" },
  VALIDADE: { label: "Validade/garantia do produto", type: "text", group: "produto_logistica", placeholder: "Ex: 24 meses a partir da fabricação" },
  DOCUMENTOS: { label: "Documentos exigidos (notas, certificados, laudos)", type: "textarea", group: "produto_logistica" },
  ENTREGA_OU_INCOTERM: { label: "Entrega ou Incoterm", type: "text", group: "produto_logistica", placeholder: "Ex: CIF porto de Santos" },
  FRETE_INCOTERM: { label: "Frete/Incoterm", type: "text", group: "produto_logistica" },
  INCOTERM_E_LOCAL: { label: "Incoterm e local", type: "text", group: "produto_logistica", placeholder: "Ex: FOB Shanghai" },
  JANELA_FORECAST: { label: "Janela de forecast", type: "text", group: "produto_logistica", placeholder: "Ex: previsão rolante de 3 meses" },
  JANELA_FIRME: { label: "Janela firme de pedidos", type: "text", group: "produto_logistica", placeholder: "Ex: 30 dias" },
  LEAD_TIME: { label: "Lead time de entrega", type: "text", group: "produto_logistica", placeholder: "Ex: 15 dias corridos" },
  TRANSFERENCIA_RISCO: { label: "Momento de transferência do risco", type: "text", group: "produto_logistica" },
  METODO_AMOSTRAGEM: { label: "Método de amostragem na inspeção", type: "text", group: "produto_logistica" },
  PRAZO_INSPECAO: { label: "Prazo de inspeção", type: "text", group: "produto_logistica", placeholder: "Ex: 5 dias úteis do recebimento" },
  PRAZO_GARANTIA: { label: "Prazo de garantia", type: "text", group: "produto_logistica", placeholder: "Ex: 12 meses" },
  FLUXO_NAO_CONFORMIDADE: { label: "Fluxo de tratamento de não conformidade", type: "textarea", group: "produto_logistica" },
  REGISTROS_RASTREABILIDADE: { label: "Registros de rastreabilidade", type: "textarea", group: "produto_logistica" },
  PLANO_RECALL: { label: "Plano de recall", type: "textarea", group: "produto_logistica" },
  FLUXO_REVERSO: { label: "Fluxo de logística reversa", type: "textarea", group: "produto_logistica" },
  PRECO: { label: "Preço", type: "money", group: "comercial" },
  PRECO_E_MOEDA: { label: "Preço e moeda", type: "text", group: "comercial", placeholder: "Ex: USD 10.000,00" },
  REAJUSTE: { label: "Reajuste", type: "text", group: "comercial", placeholder: "Ex: anual pelo IPCA" },
  PRAZO_ACEITE_PEDIDO: { label: "Prazo de aceite do pedido", type: "text", group: "comercial", placeholder: "Ex: 2 dias úteis" },
  RESPONSAVEL_LICENCAS: { label: "Responsável pelas licenças", type: "party-select", group: "responsabilidade" },
  EVIDENCIA_LICENCAS: { label: "Evidência das licenças", type: "text", group: "responsabilidade" },
  RESPONSAVEL_SEGURO: { label: "Responsável pelo seguro", type: "party-select", group: "responsabilidade" },
  APOLICE: { label: "Apólice de seguro exigida", type: "text", group: "responsabilidade" },
  RESPONSAVEL_CUSTODIA: { label: "Responsável pela custódia", type: "party-select", group: "responsabilidade" },
  CONTROLE_CUSTODIA: { label: "Controle de custódia", type: "text", group: "responsabilidade" },
  RESPONSAVEL_TRIBUTOS: { label: "Responsável pelos tributos", type: "party-select", group: "responsabilidade" },
  EVIDENCIA_TRIBUTOS: { label: "Evidência de recolhimento de tributos", type: "text", group: "responsabilidade" },

  // Parceria comercial e governança
  OFERTA_OU_PROJETO: { label: "Oferta ou projeto da parceria", type: "textarea", group: "parceria" },
  OFERTA: { label: "Oferta ou projeto (Anexo)", type: "textarea", group: "parceria" },
  OPORTUNIDADE: { label: "Oportunidade ou proposta conjunta", type: "textarea", group: "parceria" },
  TERRITORIO_CANAIS: { label: "Território e canais", type: "text", group: "parceria" },
  CONTRIBUICAO_A: { label: "Contribuição da Parte A", type: "textarea", group: "parceria" },
  CONTRIBUICAO_B: { label: "Contribuição da Parte B", type: "textarea", group: "parceria" },
  METAS: { label: "Metas da parceria", type: "textarea", group: "parceria" },
  ESCOPO_EXCLUSIVIDADE: { label: "Escopo de exclusividade", type: "textarea", group: "parceria" },
  MEMBROS_COMITE: { label: "Membros do comitê de governança", type: "textarea", group: "parceria" },
  CRITERIO_LEAD: { label: "Critério de lead válido", type: "textarea", group: "parceria" },
  PRAZO_PROTECAO: { label: "Prazo de proteção do lead", type: "text", group: "parceria", placeholder: "Ex: 90 dias" },
  BASE_RECEITA: { label: "Base de receita elegível", type: "textarea", group: "parceria" },
  DEDUCOES: { label: "Deduções sobre a receita", type: "textarea", group: "parceria" },
  PERCENTUAL: { label: "Percentual/comissão", type: "text", group: "parceria", placeholder: "Ex: 15%" },
  COMISSAO_OU_SPLIT: { label: "Comissão ou split de receita", type: "text", group: "parceria" },
  PRAZO_REPASSE: { label: "Prazo de repasse", type: "text", group: "parceria", placeholder: "Ex: 15 dias após o fechamento do mês" },
  REGRA_RESERVA: { label: "Regra de reserva/chargeback", type: "textarea", group: "parceria" },
  REGRA_POS_TERMINO: { label: "Regras aplicáveis após o término", type: "textarea", group: "parceria" },
  REGRA_MARCA: { label: "Regra de uso de marca", type: "textarea", group: "parceria" },
  TITULARIDADE_MATERIAIS: { label: "Titularidade de materiais conjuntos", type: "textarea", group: "parceria" },
  REGRA_DADOS: { label: "Regra de compartilhamento de dados/leads", type: "textarea", group: "parceria" },
  CONTROLES_CONCORRENCIA: { label: "Controles de concorrência", type: "textarea", group: "parceria" },
  REGRA_CONFLITOS: { label: "Regra de conflitos de interesse", type: "textarea", group: "parceria" },

  // Escopo, entregáveis e honorários (Consultoria)
  PROJETO: { label: "Projeto de consultoria", type: "textarea", group: "consultoria" },
  ENTREGAVEIS: { label: "Entregáveis (resumo)", type: "textarea", group: "consultoria" },
  HONORARIOS: { label: "Honorários", type: "text", group: "consultoria" },
  MILESTONES: { label: "Milestones", type: "textarea", group: "consultoria" },
  FATO_GERADOR_EXITO: { label: "Fato gerador do êxito", type: "textarea", group: "consultoria" },
  EXCLUSOES_E_LIMITACOES: { label: "Exclusões e limitações do escopo", type: "textarea", group: "consultoria" },
  ENTREGAVEL_1: { label: "Entregável — Milestone 1", type: "text", group: "consultoria" },
  ENTREGAVEL_2: { label: "Entregável — Milestone 2", type: "text", group: "consultoria" },
  ENTREGAVEL_3: { label: "Entregável — Milestone 3", type: "text", group: "consultoria" },
  PREMISSAS_1: { label: "Premissas/dependências — Milestone 1", type: "text", group: "consultoria" },
  PREMISSAS_2: { label: "Premissas/dependências — Milestone 2", type: "text", group: "consultoria" },
  PREMISSAS_3: { label: "Premissas/dependências — Milestone 3", type: "text", group: "consultoria" },
  PRAZO_1: { label: "Prazo — Milestone 1", type: "text", group: "consultoria" },
  PRAZO_2: { label: "Prazo — Milestone 2", type: "text", group: "consultoria" },
  PRAZO_3: { label: "Prazo — Milestone 3", type: "text", group: "consultoria" },
  ACEITE_1: { label: "Critério de aceite — Milestone 1", type: "text", group: "consultoria" },
  ACEITE_2: { label: "Critério de aceite — Milestone 2", type: "text", group: "consultoria" },
  ACEITE_3: { label: "Critério de aceite — Milestone 3", type: "text", group: "consultoria" },
  HONORARIO_FIXO: { label: "Honorário fixo", type: "money", group: "consultoria" },
  FATURAMENTO_MILESTONES: { label: "Faturamento por milestone", type: "textarea", group: "consultoria" },
  BASE_EXITO: { label: "Base de cálculo do êxito", type: "textarea", group: "consultoria" },
  PRECO_TRANSICAO: { label: "Preço da transição/encerramento", type: "text", group: "consultoria" },
  GESTORES: { label: "Gestores indicados por cada parte", type: "textarea", group: "consultoria" },
  PERIODICIDADE: { label: "Periodicidade de reuniões", type: "text", group: "consultoria", placeholder: "Ex: quinzenal" },
  FONTES: { label: "Fontes de dados/informação", type: "textarea", group: "consultoria" },
  PRAZO_REVISAO: { label: "Prazo de revisão dos entregáveis", type: "text", group: "consultoria", placeholder: "Ex: 5 dias úteis" },

  // Foro, arbitragem e controvérsias
  FORO: { label: "Comarca do foro", type: "text", group: "controversias", placeholder: "Ex: São Paulo/SP" },
  FORO_OU_CAMARA_ARBITRAL: { label: "Foro ou câmara arbitral", type: "text", group: "controversias", placeholder: "Ex: Comarca de São Paulo/SP" },
  CAMARA_ARBITRAL: { label: "Câmara arbitral", type: "text", group: "controversias", placeholder: "Ex: CAM-CCBC" },
  NUMERO_ARBITROS: { label: "Número de árbitros", type: "text", group: "controversias", placeholder: "Ex: 1 ou 3" },
  SEDE_ARBITRAGEM: { label: "Sede da arbitragem", type: "text", group: "controversias" },
  CONTROLLING_LANGUAGE: { label: "Idioma que prevalece em caso de divergência", type: "text", group: "controversias", placeholder: "Ex: português" },
  INTERNATIONAL_TRANSACTION: { label: "Descrição da transação internacional", type: "textarea", group: "controversias" },
};

export const CONTRACT_FIELD_GROUP_LABELS: Record<ContractFieldGroup, string> = {
  partes: "Partes",
  objeto_escopo: "Objeto e Escopo",
  comercial: "Condições Comerciais",
  sla_aceite: "SLA e Aceite",
  dados_lgpd: "Dados Pessoais (LGPD)",
  responsabilidade: "Responsabilidade e Continuidade",
  confidencialidade: "Confidencialidade e Controle de Acesso",
  controversias: "Foro e Controvérsias",
  produto_logistica: "Produto e Logística",
  parceria: "Parceria e Governança",
  consultoria: "Escopo, Entregáveis e Honorários",
  assinatura: "Assinatura",
};

// PARTE/RESPONSAVEL/RESPONSAVEL_DEPENDENCIA usam os rótulos reais de parteA/parteB
// do modelo selecionado (ex: CONTRATANTE/CONTRATADA em PS-01, CLIENTE/DESENVOLVEDORA
// em PS-04) — nunca um rótulo genérico "Parte A"/"Parte B".
export function resolvePartySelectOptions(parteA: string, parteB: string): string[] {
  return [parteA, parteB];
}
