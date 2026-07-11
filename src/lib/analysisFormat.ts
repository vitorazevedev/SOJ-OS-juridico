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
