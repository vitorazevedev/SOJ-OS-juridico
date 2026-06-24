import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { SeverityDot } from "@/components/layout/Primitives";
import { cn } from "@/lib/utils";
import type { ClauseRisk } from "@/hooks/useContractAnalysis";

const severityDimColor: Record<string, string> = {
  critico: "bg-risk-critical-dim text-risk-critical",
  alto: "bg-risk-high-dim text-risk-high",
  medio: "bg-risk-medium-dim text-risk-medium",
  baixo: "bg-risk-low-dim text-risk-low",
};

function fmtBRL(cents: number | null) {
  if (cents == null) return "—";
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Exposição é exibida como faixa (mín–máx) quando a cláusula tem uma faixa real;
// cai para o valor único quando min/max não foram calculados (dados legados).
function fmtExposureRange(min: number | null, max: number | null, likely: number | null): string {
  if (max != null && min != null && max > min) {
    return `${fmtBRL(min)} – ${fmtBRL(max)}`;
  }
  return fmtBRL(likely ?? max ?? min);
}

export function RiskClauseCard({
  clause,
  open,
  onToggle,
}: {
  clause: ClauseRisk;
  open: boolean;
  onToggle: () => void;
}) {
  const dimCls = severityDimColor[clause.severity] ?? "bg-muted text-foreground";

  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 md:px-5 py-3.5 md:py-4 hover:bg-muted/30 active:bg-muted/30 transition-colors text-left"
        style={{ minHeight: 44 }}
      >
        <SeverityDot severity={clause.severity} />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] md:text-sm">{clause.title}</p>
          {clause.category && (
            <p className="text-[10px] text-muted-foreground mt-0.5">{clause.category}</p>
          )}
        </div>
        {clause.exposure_likely != null && clause.exposure_likely > 0 && (
          <span
            className={cn("text-[10px] md:text-xs px-2 py-1 rounded-md font-medium tabular-nums shrink-0", dimCls)}
            title="Faixa estimada pela IA com base na cláusula identificada — não é um cálculo financeiro determinístico."
          >
            {fmtExposureRange(clause.exposure_min, clause.exposure_max, clause.exposure_likely)}
          </span>
        )}
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>
      {open && (
        <div className="px-4 md:px-5 pb-5 grid gap-3 animate-fade-in">
          {clause.original_text && (
            <div className="rounded-lg border border-risk-critical/20 bg-risk-critical-dim p-3 md:p-4">
              <p className="text-[11px] md:text-xs font-medium text-risk-critical flex items-center gap-1.5 mb-2">
                <AlertTriangle className="h-3.5 w-3.5" /> Original (Risco)
              </p>
              <p className="text-[12px] md:text-sm leading-relaxed text-foreground/90">{clause.original_text}</p>
            </div>
          )}
          {clause.suggestion && (
            <div className="rounded-lg border border-primary/20 bg-primary-dim p-3 md:p-4">
              <p className="text-[11px] md:text-xs font-medium text-primary flex items-center gap-1.5 mb-2">
                <CheckCircle2 className="h-3.5 w-3.5" /> Sugestão
              </p>
              <p className="text-[12px] md:text-sm leading-relaxed text-foreground/90">{clause.suggestion}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
