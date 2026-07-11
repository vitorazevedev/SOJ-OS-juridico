import { Download, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { SojCard } from "@/components/layout/Primitives";
import { generateAnalysisPdf, downloadBlob } from "@/lib/contractDocs";
import { HighlightedText, SEV_HIGHLIGHT } from "@/features/analysis/components/HighlightedText";
import { JuridicaTab } from "@/features/analysis/components/JuridicaTab";
import { FinanceiroTab } from "@/features/analysis/components/FinanceiroTab";
import { fmtDate, severityColor } from "@/lib/analysisFormat";
import { useEconomicIndexes } from "@/hooks/useEconomicIndexes";
import type { FullContract, ContractContent, ContractAnalysis, ClauseRisk } from "@/hooks/useContractAnalysis";

export function AnalisadoView({
  contract,
  content,
  analysis,
  clauses,
  tab,
  setTab,
  expanded,
  setExpanded,
  indexes,
  saveContractValue,
}: {
  contract: FullContract;
  content: ContractContent | null;
  analysis: ContractAnalysis;
  clauses: ClauseRisk[];
  tab: "juridica" | "financeiro" | "texto";
  setTab: (t: "juridica" | "financeiro" | "texto") => void;
  expanded: string | null;
  setExpanded: (id: string | null) => void;
  indexes: ReturnType<typeof useEconomicIndexes>["indexes"];
  saveContractValue: (v: number) => Promise<void>;
}) {
  const handleDownloadPdf = () => {
    const blob = generateAnalysisPdf({ contract, analysis, clauses });
    const slug = (contract.name || "analise").normalize("NFD").replace(/[̀-ͯ]/g, "")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60);
    downloadBlob(blob, `analise-${slug}.pdf`);
  };

  return (
    <>
      <div className="flex items-center gap-2 border-b border-border">
        <div className="flex gap-1 flex-1 md:gap-0 overflow-x-auto scroll-hide">
          {([
            ["juridica", "Jurídica"],
            ["financeiro", "Financeiro"],
            ["texto", "Texto Completo"],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "shrink-0 px-3 py-2 text-[11px] rounded-full border mr-1 transition-colors",
                "md:rounded-none md:border-0 md:border-b-2 md:bg-transparent md:px-5 md:py-3 md:text-sm md:-mb-px md:mr-0",
                tab === id
                  ? "border-[rgba(0,229,160,0.5)] text-[#00e5a0] bg-[rgba(0,229,160,0.08)] font-medium md:border-primary md:bg-transparent md:text-primary"
                  : "border-border text-muted-foreground md:border-transparent md:hover:text-foreground"
              )}
              style={{ minHeight: 32 }}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={handleDownloadPdf}
          className="shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors mb-px"
        >
          <Download className="h-3.5 w-3.5" /> PDF
        </button>
      </div>

      {tab === "juridica" && (
        <JuridicaTab analysis={analysis} clauses={clauses} expanded={expanded} setExpanded={setExpanded} />
      )}

      {tab === "financeiro" && (
        <FinanceiroTab
          contract={contract}
          analysis={analysis}
          clauses={clauses}
          indexes={indexes}
          saveContractValue={saveContractValue}
        />
      )}

      {tab === "texto" && (
        <SojCard>
          {content?.raw_text ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  {content.word_count?.toLocaleString("pt-BR") ?? "—"} palavras
                  {content.ocr_applied && " · via OCR"}
                  {content.parsed_at && ` · ${fmtDate(content.parsed_at)}`}
                </p>
                {clauses.some((cl) => cl.original_text) && (
                  <div className="flex flex-wrap gap-2 text-[10px]">
                    {(["critico","alto","medio","baixo"] as const).map((s) => (
                      <span key={s} className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full", SEV_HIGHLIGHT[s])}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", severityColor[s])} />
                        {{ critico: "Crítico", alto: "Alto", medio: "Médio", baixo: "Baixo" }[s]}
                      </span>
                    ))}
                    <span className="text-muted-foreground">= cláusulas destacadas</span>
                  </div>
                )}
              </div>
              <HighlightedText text={content.raw_text} clauses={clauses} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">Texto não disponível.</p>
          )}
        </SojCard>
      )}
    </>
  );
}
