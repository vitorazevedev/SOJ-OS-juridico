import { cn } from "@/lib/utils";
import { RiskBadge, SojCard } from "@/components/layout/Primitives";
import { GaugeChart } from "@/components/layout/Charts";
import { RiskClauseCard } from "@/features/analysis/components/RiskClauseCard";
import { fmtBRL } from "@/lib/analysisFormat";
import type { ContractAnalysis, ClauseRisk } from "@/hooks/useContractAnalysis";

export function JuridicaTab({
  analysis,
  clauses,
  expanded,
  setExpanded,
}: {
  analysis: ContractAnalysis;
  clauses: ClauseRisk[];
  expanded: string | null;
  setExpanded: (id: string | null) => void;
}) {
  const riskScore = analysis.risk_score ?? 0;
  const sevCount = {
    critico: clauses.filter((c) => c.severity === "critico").length,
    alto: clauses.filter((c) => c.severity === "alto").length,
    medio: clauses.filter((c) => c.severity === "medio").length,
    baixo: clauses.filter((c) => c.severity === "baixo").length,
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SojCard className="flex flex-col items-center text-center">
          <span className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider mb-2">Score de Risco</span>
          <div className="md:hidden"><GaugeChart score={riskScore} compact /></div>
          <div className="hidden md:block"><GaugeChart score={riskScore} /></div>
          <RiskBadge score={riskScore} />
          <p className="text-[11px] md:text-xs text-muted-foreground mt-3">{clauses.length} cláusulas identificadas</p>
          <p className="text-[10px] text-muted-foreground/70 mt-2 leading-tight px-1 border-t border-border pt-2">
            Estimativa gerada por IA — não é avaliação jurídica definitiva. Consulte um advogado.
          </p>
          <div className="grid grid-cols-2 gap-2 mt-4 w-full">
            {([
              ["Crítico", "bg-risk-critical", sevCount.critico],
              ["Alto", "bg-risk-high", sevCount.alto],
              ["Médio", "bg-risk-medium", sevCount.medio],
              ["Baixo", "bg-risk-low", sevCount.baixo],
            ] as const).map(([lbl, dot, n]) => (
              <div key={lbl} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
                <span className="flex items-center gap-2 text-[11px] md:text-xs">
                  <span className={cn("h-2 w-2 rounded-full", dot)} />
                  {lbl}
                </span>
                <span className="text-sm font-semibold tabular-nums">{n}</span>
              </div>
            ))}
          </div>
        </SojCard>

        <SojCard className="lg:col-span-2 flex flex-col gap-4">
          {analysis.financial_total != null && (
            <div className="grid grid-cols-1 gap-2.5">
              <div className="rounded-lg bg-risk-critical-dim p-3">
                <p className="text-[10px] md:text-[11px] text-muted-foreground uppercase tracking-wider">Exposição financeira total estimada</p>
                <p className="text-base md:text-lg font-semibold text-risk-critical tabular-nums mt-1">
                  {fmtBRL(analysis.financial_total)}
                </p>
                <p className="text-[10px] text-muted-foreground/70 mt-1.5">
                  Estimativa de IA com base nas cláusulas identificadas — não é cálculo financeiro ou jurídico definitivo.
                </p>
              </div>
            </div>
          )}
          {analysis.summary && (
            <div className="rounded-lg bg-muted/40 p-3.5 md:p-4">
              <h4 className="text-sm font-medium mb-2">Resumo Executivo</h4>
              <p className="text-[13px] md:text-sm text-muted-foreground leading-relaxed">{analysis.summary}</p>
            </div>
          )}
          {!analysis.summary && !analysis.financial_total && (
            <p className="text-sm text-muted-foreground">Resumo não disponível.</p>
          )}
        </SojCard>
      </div>

      <SojCard padding={false}>
        <div className="px-4 md:px-5 py-3.5 md:py-4 border-b border-border">
          <h3 className="font-medium text-sm md:text-base">Cláusulas Identificadas</h3>
          <p className="text-[11px] md:text-xs text-muted-foreground mt-0.5">Toque para expandir</p>
        </div>
        {clauses.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">Nenhuma cláusula de risco identificada.</p>
        ) : (
          <div className="divide-y divide-border">
            {clauses.map((cl) => (
              <RiskClauseCard
                key={cl.id}
                clause={cl}
                open={expanded === cl.id}
                onToggle={() => setExpanded(expanded === cl.id ? null : cl.id)}
              />
            ))}
          </div>
        )}
      </SojCard>
    </>
  );
}
