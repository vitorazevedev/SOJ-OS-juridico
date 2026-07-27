import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";
import { RiskBadge, SojCard } from "@/components/layout/Primitives";
import { GaugeChart } from "@/components/layout/Charts";
import { ClauseListItem, ClauseDetailPanel } from "@/features/analysis/components/RiskClauseCard";
import { findClauseSentence } from "@/features/analysis/components/HighlightedText";
import { fmtBRL, resolvedIndex, gravidadeFaixa, GRAVIDADE_HIGHLIGHT } from "@/lib/analysisFormat";
import { useOrganization } from "@/hooks/useOrganization";
import type { ContractAnalysis, ClauseRisk, ContractContent, ReviewStatus } from "@/hooks/useContractAnalysis";

export function JuridicaTab({
  analysis,
  clauses,
  content,
  expanded,
  setExpanded,
  updateClauseReview,
  updateClauseSuggestion,
}: {
  analysis: ContractAnalysis;
  clauses: ClauseRisk[];
  content: ContractContent | null;
  expanded: string | null;
  setExpanded: (id: string | null) => void;
  updateClauseReview: (clauseId: string, status: ReviewStatus) => Promise<void>;
  updateClauseSuggestion: (clauseId: string, suggestion: string) => Promise<void>;
}) {
  const { org } = useOrganization();
  const isStarter = org?.plan_status === "active";
  const { value: indexValue, legacy: isLegacyIndex } = resolvedIndex(analysis);
  const riskScore = indexValue ?? 0;
  const [leftTab, setLeftTab] = useState<"achados" | "documento">("achados");
  const zonaCount = { critico: 0, atencao: 0, equilibrado: 0 };
  clauses.forEach((c) => {
    if (c.gravidade == null) return;
    zonaCount[gravidadeFaixa(c.gravidade).zone]++;
  });

  // Seleciona automaticamente a cláusula de maior gravidade ao carregar, pra
  // o painel de detalhe nunca ficar vazio (layout master-detail, Fase 5).
  useEffect(() => {
    if (expanded || clauses.length === 0) return;
    const top = [...clauses].sort((a, b) => (b.gravidade ?? -1) - (a.gravidade ?? -1))[0];
    setExpanded(top.id);
  }, [clauses, expanded, setExpanded]);

  const selectedClause = clauses.find((c) => c.id === expanded) ?? null;

  // O painel de detalhe manda na altura da linha: a lista de achados/documento
  // nunca deixa a linha mais alta que ele — se tiver mais conteúdo, ganha
  // scroll próprio limitado a essa altura, em vez de esticar a linha inteira
  // e deixar um vão em branco no painel de detalhe (mais curto).
  const detailRef = useRef<HTMLDivElement>(null);
  const [detailHeight, setDetailHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const el = detailRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setDetailHeight(entry.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4">
        <SojCard className="flex flex-col items-center text-center">
          <span className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider mb-2">Índice de Desequilíbrio</span>
          {isStarter ? (
            <>
              <div className="md:hidden"><GaugeChart score={riskScore} compact /></div>
              <div className="hidden md:block"><GaugeChart score={riskScore} /></div>
              <RiskBadge score={riskScore} />
              {isLegacyIndex && indexValue != null && (
                <span className="text-[10px] text-muted-foreground/70 mt-1">cálculo legado</span>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 py-6">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <Lock className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground max-w-[200px]">
                Disponível no plano Starter
              </p>
            </div>
          )}
          <p className="text-[11px] md:text-xs text-muted-foreground mt-3">{clauses.length} cláusulas identificadas</p>
          {analysis.parte_representada && (
            <div className="w-full mt-3 rounded-lg bg-primary-dim border border-primary/30 px-3 py-2.5 text-left">
              <p className="text-[11px] md:text-xs text-foreground/90 leading-relaxed">
                Índice calculado considerando que você representa{" "}
                <span className="font-semibold">{analysis.parte_representada}</span>.
              </p>
            </div>
          )}
          <p className="text-[10px] text-muted-foreground/70 mt-2 leading-tight px-1 border-t border-border pt-2">
            Estimativa gerada por IA, não é avaliação jurídica definitiva. Consulte um advogado.
          </p>
          <div className="flex flex-col gap-2 mt-4 w-full">
            {([
              ["Crítico", "bg-risk-critical", zonaCount.critico],
              ["Atenção", "bg-risk-medium", zonaCount.atencao],
              ["Equilibrado", "bg-risk-low", zonaCount.equilibrado],
            ] as const).map(([lbl, dot, n]) => (
              <div key={lbl} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
                <span className="flex items-center gap-2 text-[11px] md:text-xs">
                  <span className={cn("h-2 w-2 rounded-full shrink-0", dot)} />
                  {lbl}
                </span>
                <span className="text-sm font-semibold tabular-nums">{n}</span>
              </div>
            ))}
          </div>
        </SojCard>

        <SojCard className="flex flex-col gap-4">
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

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4">
        <SojCard padding={false} className="flex flex-col">
          <div className="flex border-b border-border shrink-0">
            {([
              ["achados", `Achados (${clauses.length})`],
              ["documento", "Documento"],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setLeftTab(id)}
                className={cn(
                  "flex-1 px-3 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors",
                  leftTab === id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {leftTab === "achados" ? (
            clauses.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10 px-4">Nenhuma cláusula de risco identificada.</p>
            ) : (
              <div
                className="divide-y divide-border overflow-y-auto scroll-thin"
                style={{ maxHeight: detailHeight }}
              >
                {clauses.map((cl) => (
                  <ClauseListItem
                    key={cl.id}
                    clause={cl}
                    selected={expanded === cl.id}
                    onSelect={() => setExpanded(cl.id)}
                  />
                ))}
              </div>
            )
          ) : (
            (() => {
              const withText = clauses.filter((cl) => cl.original_text);
              return withText.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10 px-4">Nenhum trecho disponível.</p>
              ) : (
                <div
                  className="divide-y divide-border overflow-y-auto scroll-thin"
                  style={{ maxHeight: detailHeight }}
                >
                  {withText.map((cl) => {
                    const sentence = content?.raw_text ? findClauseSentence(content.raw_text, cl.original_text!) : null;
                    const highlight = cl.gravidade != null ? GRAVIDADE_HIGHLIGHT[gravidadeFaixa(cl.gravidade).zone] : "bg-yellow-500/20";
                    return (
                      <div
                        key={cl.id}
                        className={cn("p-3", expanded === cl.id && "bg-primary-dim")}
                      >
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                          ▪ {cl.category ?? cl.title} · Achado registrado
                        </p>
                        {sentence ? (
                          <p className="text-[12px] md:text-sm leading-relaxed text-foreground/90">
                            {sentence.before}
                            <span className={cn("rounded-sm", highlight)}>{sentence.match}</span>
                            {sentence.after}
                          </p>
                        ) : (
                          <p className={cn("text-[12px] md:text-sm leading-relaxed rounded-sm px-1 py-0.5", highlight)}>
                            {cl.original_text}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()
          )}
        </SojCard>

        <SojCard padding={false}>
          <div ref={detailRef}>
            {selectedClause ? (
              <ClauseDetailPanel
                clause={selectedClause}
                onViewInContract={() => setLeftTab("documento")}
                updateClauseReview={updateClauseReview}
                updateClauseSuggestion={updateClauseSuggestion}
              />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10 px-4">Selecione uma cláusula para ver o detalhe.</p>
            )}
          </div>
        </SojCard>
      </div>
    </>
  );
}
