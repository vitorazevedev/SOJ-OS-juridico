export function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

export function fmtBytes(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function fmtBRL(cents: number | null) {
  if (cents == null) return "—";
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Exposição financeira total: 0 não significa "sem risco financeiro", significa que
// nenhuma cláusula tinha valor monetário explícito no texto (has_explicit_amount).
// "R$ 0,00" nesse caso é enganoso — deixa parecer um cálculo, quando na verdade é
// ausência de base para calcular.
export function fmtBRLExposicao(cents: number | null) {
  if (!cents) return "Não quantificável";
  return fmtBRL(cents);
}

// Exposição é exibida como faixa (mín–máx) quando a cláusula tem uma faixa real;
// cai para o valor único quando min/max não foram calculados (dados legados).
export function fmtExposureRange(min: number | null, max: number | null, likely: number | null): string {
  if (max != null && min != null && max > min) {
    return `${fmtBRL(min)} – ${fmtBRL(max)}`;
  }
  return fmtBRL(likely ?? max ?? min);
}

// Índice de Desequilíbrio substitui o antigo risk_score, mas só é calculado quando a
// análise tem parte_representada. Análises anteriores a essa mudança (ou sem parte
// informada) caem no risk_score como fallback, marcadas como "legado".
export function resolvedIndex(a: { risk_score: number | null; indice_desequilibrio: number | null }) {
  return {
    value: a.indice_desequilibrio ?? a.risk_score,
    legacy: a.indice_desequilibrio == null,
  };
}

// Polaridade/desvio por cláusula (Fase 4) ainda depende da calibração de três
// passadas descrita na DEC-047 — bloqueadora até aprovação formal do Fellipe.
// Enquanto false, toda exibição desses campos vem com uma tag "Pré-calibração".
// Trocar para true de uma vez só quando a calibração for aprovada.
export const POLARIDADE_CALIBRADA = false;

// Régua única de faixas de risco (0-100), usada tanto por cláusula (gravidade)
// quanto pelo índice agregado do contrato — antes existiam 2 réguas divergentes
// (uma para badge por cláusula, outra para o badge do índice/score), nenhuma
// batendo com os cortes que o Fellipe já tinha especificado (v2.1) na tabela
// indice_desequilibrio_parametros (piso_critico=80, piso_alto=60, piso_medio=30).
// Unificado aqui: mesmos cortes e mesmos nomes nos dois lugares.
export type GravidadeZona = "critico" | "alto" | "medio" | "baixo";

export function gravidadeFaixa(gravidade: number): { zone: GravidadeZona; label: string; dot: string; text: string; bg: string } {
  if (gravidade >= 80) return { zone: "critico", label: "Risco crítico", dot: "bg-risk-critical", text: "text-risk-critical", bg: "bg-risk-critical-dim" };
  if (gravidade >= 60) return { zone: "alto", label: "Risco alto", dot: "bg-risk-high", text: "text-risk-high", bg: "bg-risk-high-dim" };
  if (gravidade >= 30) return { zone: "medio", label: "Risco médio", dot: "bg-risk-medium", text: "text-risk-medium", bg: "bg-risk-medium-dim" };
  return { zone: "baixo", label: "Risco baixo", dot: "bg-risk-low", text: "text-risk-low", bg: "bg-risk-low-dim" };
}

// Destaque de texto por zona de gravidade (mesmo padrão visual de SEV_HIGHLIGHT,
// agora nas mesmas 4 faixas da régua unificada acima).
export const GRAVIDADE_HIGHLIGHT: Record<GravidadeZona, string> = {
  critico: "bg-risk-critical/25 border-b-2 border-risk-critical",
  alto: "bg-risk-high/25 border-b-2 border-risk-high",
  medio: "bg-risk-medium/25 border-b-2 border-risk-medium",
  baixo: "bg-risk-low/25 border-b-2 border-risk-low",
};

export const severityColor: Record<string, string> = {
  critico: "bg-risk-critical",
  alto: "bg-risk-high",
  medio: "bg-risk-medium",
  baixo: "bg-risk-low",
};

// Redução estimada de exposição por severidade ao aplicar sugestões
export const SEV_REDUCTION: Record<string, number> = { critico: 0.80, alto: 0.60, medio: 0.40, baixo: 0.20 };

// Base params label (values replaced with real indexes at runtime)
export const PARAMS_LABELS = [
  "Índice de correção (IPCA)",
  "Taxa SELIC",
  "Base de cálculo",
  "Prazo de referência",
];
