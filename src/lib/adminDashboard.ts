// Preço real por token (USD/1M tokens) dos modelos usados em parse-contract (Haiku)
// e analyze-contract (Sonnet) — substitui a antiga estimativa fixa por operação,
// que ficou desatualizada quando o prompt de análise cresceu (banco de âncoras,
// contexto shadow, gating).
const HAIKU_INPUT_USD_PER_MTOK = 1;
const HAIKU_OUTPUT_USD_PER_MTOK = 5;
const SONNET_INPUT_USD_PER_MTOK = 3;
const SONNET_OUTPUT_USD_PER_MTOK = 15;
const USD_BRL_RATE = 5.5; // cotação aproximada — só para a estimativa do painel Dev

export type Stats = {
  total_orgs: number;
  total_contracts: number;
  contracts_this_month: number;
  total_analyses: number;
  analyses_this_month: number;
  total_feedbacks: number;
  total_waitlist: number;
  parse_tokens_input_month: number;
  parse_tokens_output_month: number;
  analysis_tokens_input_month: number;
  analysis_tokens_output_month: number;
};

export function aiCostBRL(tokens: {
  parseTokensInput: number;
  parseTokensOutput: number;
  analysisTokensInput: number;
  analysisTokensOutput: number;
}): number {
  const parseUSD =
    (tokens.parseTokensInput / 1_000_000) * HAIKU_INPUT_USD_PER_MTOK +
    (tokens.parseTokensOutput / 1_000_000) * HAIKU_OUTPUT_USD_PER_MTOK;
  const analysisUSD =
    (tokens.analysisTokensInput / 1_000_000) * SONNET_INPUT_USD_PER_MTOK +
    (tokens.analysisTokensOutput / 1_000_000) * SONNET_OUTPUT_USD_PER_MTOK;
  return (parseUSD + analysisUSD) * USD_BRL_RATE;
}

export function estimatedCostBRL(stats: Stats): number {
  return aiCostBRL({
    parseTokensInput: stats.parse_tokens_input_month,
    parseTokensOutput: stats.parse_tokens_output_month,
    analysisTokensInput: stats.analysis_tokens_input_month,
    analysisTokensOutput: stats.analysis_tokens_output_month,
  });
}

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
