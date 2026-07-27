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

// Três faixas de risco por cláusula, calculadas a partir da gravidade contínua
// (0-100), no mesmo espírito de scoreToLevel mas com rótulos do painel de
// detalhe da cláusula (Fase 4).
export type GravidadeZona = "critico" | "atencao" | "equilibrado";

export function gravidadeFaixa(gravidade: number): { zone: GravidadeZona; label: string; dot: string; text: string; bg: string } {
  if (gravidade >= 65) return { zone: "critico", label: "Risco crítico", dot: "bg-risk-critical", text: "text-risk-critical", bg: "bg-risk-critical-dim" };
  if (gravidade >= 35) return { zone: "atencao", label: "Risco de atenção", dot: "bg-risk-medium", text: "text-risk-medium", bg: "bg-risk-medium-dim" };
  return { zone: "equilibrado", label: "Risco equilibrado", dot: "bg-risk-low", text: "text-risk-low", bg: "bg-risk-low-dim" };
}

// Destaque de texto por zona de gravidade (mesmo padrão visual de SEV_HIGHLIGHT,
// mas nas 3 faixas novas em vez das 4 categorias antigas de severity).
export const GRAVIDADE_HIGHLIGHT: Record<GravidadeZona, string> = {
  critico: "bg-risk-critical/25 border-b-2 border-risk-critical",
  atencao: "bg-risk-medium/25 border-b-2 border-risk-medium",
  equilibrado: "bg-risk-low/25 border-b-2 border-risk-low",
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
