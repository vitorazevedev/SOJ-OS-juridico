import { CheckCircle2, FileText, Info, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SojCard } from "@/components/layout/Primitives";
import { ParsedDataSummary } from "@/features/contracts/components/ParsedDataSummary";
import { fmtBytes, fmtDate } from "@/lib/analysisFormat";
import type { FullContract, ContractContent } from "@/hooks/useContractAnalysis";

export function InAnaliseView({
  contract,
  content,
  tab,
  setTab,
  onAnalyze,
  analyzing,
}: {
  contract: FullContract;
  content: ContractContent | null;
  tab: "info" | "texto";
  setTab: (t: "info" | "texto") => void;
  onAnalyze: () => void;
  analyzing: boolean;
}) {
  return (
    <>
      <div className="rounded-lg border border-primary/30 bg-primary-dim px-4 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-start gap-3 flex-1">
          {analyzing
            ? <Loader2 className="h-4 w-4 text-primary shrink-0 mt-0.5 animate-spin" />
            : <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          }
          <div>
            <p className="text-sm font-medium text-primary">
              {analyzing ? "Análise em andamento..." : "Texto extraído — pronto para análise"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {analyzing
                ? "A IA está lendo o contrato. Isso pode levar até 45 segundos."
                : content?.word_count
                  ? `${content.word_count.toLocaleString("pt-BR")} palavras extraídas. Clique em Analisar para iniciar a análise jurídica.`
                  : "Clique em Analisar para iniciar a análise jurídica com IA."}
            </p>
          </div>
        </div>
        <button
          onClick={onAnalyze}
          disabled={analyzing}
          className="shrink-0 inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60 transition-opacity"
        >
          {analyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Loader2 className="h-3.5 w-3.5 hidden" />}
          {analyzing ? "Analisando..." : "Analisar Contrato"}
        </button>
      </div>

      <div className="flex gap-1 border-b border-border -mx-0 md:gap-0">
        {([["info", "Informações"], ["texto", "Texto Completo"]] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "px-4 py-2.5 text-sm transition-colors border-b-2 -mb-px",
              tab === id
                ? "border-primary text-primary font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "info" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contract.parsed_data && <ParsedDataSummary data={contract.parsed_data} />}
          <SojCard className="flex flex-col gap-3">
            <h3 className="font-medium text-sm flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" /> Metadados do Contrato
            </h3>
            <dl className="text-sm space-y-2.5 divide-y divide-border">
              {[
                ["Nome", contract.name],
                ["Partes", contract.party ?? "—"],
                ["Tipo", contract.type ?? "—"],
                ["Arquivo", contract.file_name ?? "—"],
                ["Tamanho", fmtBytes(contract.file_size)],
                ["Páginas", contract.page_count != null ? String(contract.page_count) : "—"],
                ["Enviado em", fmtDate(contract.created_at)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between pt-2.5 first:pt-0">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="text-right max-w-[55%] truncate">{v}</dd>
                </div>
              ))}
            </dl>
          </SojCard>

          <SojCard className="flex flex-col gap-3">
            <h3 className="font-medium text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" /> Extração de Texto
            </h3>
            {content ? (
              <dl className="text-sm space-y-2.5 divide-y divide-border">
                {[
                  ["Palavras", content.word_count != null ? content.word_count.toLocaleString("pt-BR") : "—"],
                  ["OCR aplicado", content.ocr_applied ? "Sim" : "Não"],
                  ["Extraído em", fmtDate(content.parsed_at)],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between pt-2.5 first:pt-0">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">Texto ainda não extraído.</p>
            )}
          </SojCard>
        </div>
      )}

      {tab === "texto" && (
        <SojCard>
          {content?.raw_text ? (
            <>
              <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                {content.word_count?.toLocaleString("pt-BR") ?? "—"} palavras
                {content.ocr_applied && " · via OCR"}
              </p>
              <article className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap font-mono max-h-[60vh] overflow-y-auto scroll-hide">
                {content.raw_text}
              </article>
            </>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">Texto não disponível.</p>
          )}
        </SojCard>
      )}
    </>
  );
}
