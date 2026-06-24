export type RiskLevel = "critico" | "alto" | "medio" | "baixo";

export type Contract = {
  id: string;
  name: string;
  party: string;
  type: string;
  status: "Analisado" | "Em análise" | "Pendente" | "Assinado";
  risk: number;
  exposure: number;
  date: string;
};

export type Clause = {
  id: string;
  title: string;
  severity: RiskLevel;
  exposure: number;
  category: "Financeiro" | "Operacional" | "Regulatório";
  original: string;
  suggestion: string;
};

export type Obligation = {
  id: string;
  desc: string;
  contract: string;
  party: string;
  due: string;
  value: string;
  status: "urgente" | "proximo" | "normal";
};

export type Template = {
  id: string;
  icon: string;
  title: string;
  desc: string;
};

export const CONTRACTS: Contract[] = [
  { id: "c1", name: "Prestação de Serviços #4821", party: "Acme Tecnologia LTDA", type: "Serviços", status: "Analisado", risk: 78, exposure: 595000, date: "24/04/2026" },
  { id: "c2", name: "NDA Estratégico #4820", party: "Beta Innovations SA", type: "Confidencialidade", status: "Analisado", risk: 32, exposure: 0, date: "23/04/2026" },
  { id: "c3", name: "Fornecimento Cloud #4819", party: "Cloud Provider Inc", type: "Fornecimento", status: "Em análise", risk: 64, exposure: 320000, date: "22/04/2026" },
  { id: "c4", name: "Licenciamento SaaS #4818", party: "DataCorp BR", type: "Licenciamento", status: "Analisado", risk: 51, exposure: 145000, date: "20/04/2026" },
  { id: "c5", name: "Parceria Comercial #4817", party: "Echo Ventures", type: "Parceria", status: "Pendente", risk: 28, exposure: 0, date: "18/04/2026" },
  { id: "c6", name: "Prestação Consultoria #4816", party: "Foxtrot Consulting", type: "Serviços", status: "Analisado", risk: 72, exposure: 280000, date: "15/04/2026" },
  { id: "c7", name: "NDA Mútuo #4815", party: "Gamma Labs", type: "Confidencialidade", status: "Assinado", risk: 18, exposure: 0, date: "12/04/2026" },
  { id: "c8", name: "Contrato Fornecimento #4814", party: "Helios Energia", type: "Fornecimento", status: "Analisado", risk: 45, exposure: 88000, date: "10/04/2026" },
];

export const CLAUSES: Clause[] = [
  { id: "cl1", title: "Multa por inadimplemento unilateral (30%)", severity: "critico", exposure: 360000, category: "Financeiro", original: "Em caso de rescisão unilateral pelo contratado, fica estabelecida multa equivalente a 30% do valor total do contrato, independentemente do motivo alegado, devida de forma imediata e integral.", suggestion: "Em caso de rescisão unilateral, a multa será limitada a 10% do valor remanescente do contrato, com aviso prévio mínimo de 30 dias e direito ao contraditório." },
  { id: "cl2", title: "Ausência de limitação de responsabilidade", severity: "critico", exposure: 235000, category: "Financeiro", original: "O contratado responderá integralmente por quaisquer danos diretos ou indiretos decorrentes da execução deste contrato, sem qualquer limitação de valor.", suggestion: "A responsabilidade do contratado fica limitada ao valor pago nos últimos 12 meses, excluídos lucros cessantes e danos indiretos." },
  { id: "cl3", title: "Foro exclusivo em outra comarca", severity: "alto", exposure: 0, category: "Operacional", original: "Fica eleito o foro da comarca de São Paulo-SP, com renúncia expressa a qualquer outro.", suggestion: "Eleger foro da sede do contratado ou aplicar arbitragem CAM-CCBC para reduzir custo de litígio." },
  { id: "cl4", title: "Reajuste anual sem índice definido", severity: "medio", exposure: 42000, category: "Regulatório", original: "Os valores serão reajustados anualmente pelo índice mais favorável ao contratante, conforme prática de mercado.", suggestion: "Definir IPCA ou IGPM-FGV como índice oficial, com revisão pactuada e teto de variação de 8% a.a." },
  { id: "cl5", title: "Prazo de pagamento estendido (60 dias)", severity: "medio", exposure: 213000, category: "Operacional", original: "O pagamento será efetuado em até 60 (sessenta) dias após a emissão da nota fiscal.", suggestion: "Reduzir prazo para 30 dias após emissão da NF, com multa de 2% e juros de 1% a.m. por atraso." },
  { id: "cl6", title: "Confidencialidade simétrica", severity: "baixo", exposure: 0, category: "Operacional", original: "As partes obrigam-se a manter sigilo absoluto sobre informações confidenciais por prazo de 5 anos.", suggestion: "Cláusula adequada. Considerar adicionar exceções para informações já públicas." },
];

export const OBLIGATIONS: Obligation[] = [
  { id: "o1", desc: "Pagamento de mensalidade", contract: "Fornecimento Cloud #4819", party: "Cloud Provider Inc", due: "27/04/2026", value: "R$ 18.500", status: "urgente" },
  { id: "o2", desc: "Renovação automática contrato", contract: "Licenciamento SaaS #4818", party: "DataCorp BR", due: "30/04/2026", value: "R$ 145.000", status: "urgente" },
  { id: "o3", desc: "Entrega de relatório trimestral", contract: "Prestação Consultoria #4816", party: "Foxtrot Consulting", due: "05/05/2026", value: "-", status: "proximo" },
  { id: "o4", desc: "Reunião de governança", contract: "Parceria Comercial #4817", party: "Echo Ventures", due: "10/05/2026", value: "-", status: "proximo" },
  { id: "o5", desc: "Auditoria de segurança", contract: "Fornecimento Cloud #4819", party: "Cloud Provider Inc", due: "22/05/2026", value: "-", status: "normal" },
  { id: "o6", desc: "Pagamento parcela #2", contract: "Prestação de Serviços #4821", party: "Acme Tecnologia LTDA", due: "28/05/2026", value: "R$ 49.500", status: "normal" },
];

export const TEMPLATES: Template[] = [
  { id: "servicos", icon: "📋", title: "Prestação de Serviços", desc: "Contrato padrão para serviços B2B com SLA e cláusulas equilibradas." },
  { id: "nda", icon: "🔒", title: "NDA / Confidencialidade", desc: "Acordo de não-divulgação mútuo com prazo e exceções padronizadas." },
  { id: "fornecimento", icon: "📦", title: "Fornecimento", desc: "Contrato de fornecimento com cláusulas de qualidade e logística." },
  { id: "licenca", icon: "💻", title: "Licenciamento SaaS", desc: "Licença de uso de software com termos de propriedade intelectual." },
  { id: "parceria", icon: "🤝", title: "Parceria Comercial", desc: "Acordo de parceria estratégica com divisão de receita." },
  { id: "consultoria", icon: "🎯", title: "Consultoria", desc: "Contrato de consultoria com entregáveis e milestones definidos." },
];

export const CHART_DATA = [
  { month: "Nov", contracts: 18, exposure: 420 },
  { month: "Dez", contracts: 22, exposure: 510 },
  { month: "Jan", contracts: 28, exposure: 680 },
  { month: "Fev", contracts: 25, exposure: 590 },
  { month: "Mar", contracts: 34, exposure: 820 },
  { month: "Abr", contracts: 31, exposure: 940 },
];
