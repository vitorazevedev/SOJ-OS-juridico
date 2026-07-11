// Custo estimado por operação (valores do doc de custos para o Kober)
export const COST_PARSE_BRL = 0.05; // Haiku — parse/extração de texto
export const COST_ANALYSIS_BRL = 0.45; // Sonnet — análise jurídica

export type Stats = {
  total_orgs: number;
  total_contracts: number;
  contracts_this_month: number;
  total_analyses: number;
  analyses_this_month: number;
  total_feedbacks: number;
  total_waitlist: number;
};

export type WaitlistEntry = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  role: string | null;
  message: string | null;
  created_at: string;
};
export type Feedback = { id: string; category: string; message: string; page_url: string | null; created_at: string };
export type Org       = { id: string; name: string; plan_id: string; created_at: string; contract_count: number; analysis_count: number };
export type DayCount  = { day: string; count: number };
export type Contract  = { id: string; name: string; status: string; created_at: string; org_name: string };
export type CronJob   = { jobname: string; schedule: string; status: string | null; start_time: string | null; return_message: string | null };

export const PLAN_LABEL: Record<string, string> = { starter: "Starter", pro: "Pro", enterprise: "Enterprise" };
export const CAT_LABEL:  Record<string, string> = { utilidade: "Sugestão", erro: "Erro", omissao: "Omissão" };
export const STATUS_LABEL: Record<string, string> = {
  aguardando: "Aguardando", em_analise: "Pronto p/ análise", analisado: "Analisado",
};

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}
export function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
