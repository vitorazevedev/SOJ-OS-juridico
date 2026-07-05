import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useContractAnalysis } from "@/hooks/useContractAnalysis";
import { useEconomicIndexes } from "@/hooks/useEconomicIndexes";
import { RiskBadge, SojCard } from "@/components/layout/Primitives";
import { GaugeChart } from "@/components/layout/Charts";
import {
  ArrowLeft, FileText,
  CheckCircle2, Clock, Loader2, Info, Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { generateAnalysisPdf, downloadBlob } from "@/lib/contractDocs";
import { ParsedDataSummary } from "@/features/contracts/components/ParsedDataSummary";
import { HighlightedText, SEV_HIGHLIGHT } from "@/features/analysis/components/HighlightedText";
import { RiskClauseCard } from "@/features/analysis/components/RiskClauseCard";
import { FinancialSimulator } from "@/features/analysis/components/FinancialSimulator";
import { AnalysisFeedbackPrompt } from "@/features/analysis/components/AnalysisFeedbackPrompt";

// ─── helpers ────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function fmtBytes(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

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

const severityColor: Record<string, string> = {
  critico: "bg-risk-critical",
  alto: "bg-risk-high",
  medio: "bg-risk-medium",
  baixo: "bg-risk-low",
};

// Redução estimada de exposição por severidade ao aplicar sugestões
const SEV_REDUCTION: Record<string, number> = { critico: 0.80, alto: 0.60, medio: 0.40, baixo: 0.20 };

// Base params label (values replaced with real indexes at runtime)
const PARAMS_LABELS = [
  "Índice de correção (IPCA)",
  "Taxa SELIC",
  "Base de cálculo",
  "Prazo de referência",
];

// ─── sub-views ──────────────────────────────────────────────────────────────

function AguardandoView({ contract }: { contract: NonNullable<ReturnType<typeof useContractAnalysis>["contract"]> }) {
  return (
    <SojCard className="flex flex-col items-center gap-4 py-10 text-center">
      <div className="h-14 w-14 rounded-full bg-muted/40 flex items-center justify-center">
        <Clock className="h-7 w-7 text-muted-foreground" />
      </div>
      <div>
        <p className="font-medium">Aguardando processamento</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          O arquivo foi recebido e está na fila para extração de texto e análise jurídica.
        </p>
      </div>
      <div className="w-full max-w-xs mt-2 grid grid-cols-2 gap-2 text-xs text-left">
        {[
          ["Arquivo", contract.file_name ?? "—"],
          ["Tamanho", fmtBytes(contract.file_size)],
          ["Tipo", contract.file_type ?? "—"],
          ["Páginas", contract.page_count != null ? String(contract.page_count) : "—"],
          ["Enviado em", fmtDate(contract.created_at)],
          ["Partes", contract.party ?? "—"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg bg-muted/30 p-2.5">
            <p className="text-muted-foreground mb-0.5">{k}</p>
            <p className="font-medium truncate">{v}</p>
          </div>
        ))}
      </div>
    </SojCard>
  );
}

function InAnaliseView({
  contract,
  content,
  tab,
  setTab,
  onAnalyze,
  analyzing,
}: {
  contract: NonNullable<ReturnType<typeof useContractAnalysis>["contract"]>;
  content: ReturnType<typeof useContractAnalysis>["content"];
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


function AnalisadoView({
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
  contract: NonNullable<ReturnType<typeof useContractAnalysis>["contract"]>;
  content: ReturnType<typeof useContractAnalysis>["content"];
  analysis: NonNullable<ReturnType<typeof useContractAnalysis>["analysis"]>;
  clauses: ReturnType<typeof useContractAnalysis>["clauses"];
  tab: "juridica" | "financeiro" | "texto";
  setTab: (t: "juridica" | "financeiro" | "texto") => void;
  expanded: string | null;
  setExpanded: (id: string | null) => void;
  indexes: ReturnType<typeof useEconomicIndexes>["indexes"];
  saveContractValue: (v: number) => Promise<void>;
}) {
  const riskScore = analysis.risk_score ?? 0;
  const totalExposure = clauses.reduce((s, cl) => s + (cl.exposure_likely ?? 0), 0);
  const adjustedExposure = clauses.reduce((s, cl) => {
    const reduction = SEV_REDUCTION[cl.severity] ?? 0;
    return s + (cl.exposure_likely ?? 0) * (1 - reduction);
  }, 0);

  const handleDownloadPdf = () => {
    const blob = generateAnalysisPdf({ contract, analysis, clauses });
    const slug = (contract.name || "analise").normalize("NFD").replace(/[̀-ͯ]/g, "")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60);
    downloadBlob(blob, `analise-${slug}.pdf`);
  };

  const sevCount = {
    critico: clauses.filter((c) => c.severity === "critico").length,
    alto: clauses.filter((c) => c.severity === "alto").length,
    medio: clauses.filter((c) => c.severity === "medio").length,
    baixo: clauses.filter((c) => c.severity === "baixo").length,
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
      )}

      {tab === "financeiro" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <SojCard className="lg:col-span-2 flex flex-col gap-4">
            <div className="flex items-baseline justify-between">
              <h3 className="font-medium text-sm md:text-base">Exposição por Cláusula</h3>
              <p className="text-lg md:text-xl font-semibold text-risk-critical tabular-nums">
                {fmtBRL(totalExposure)}
              </p>
            </div>
            {clauses.filter((cl) => (cl.exposure_likely ?? 0) > 0).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma exposição financeira mapeada nas cláusulas.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {clauses
                  .filter((cl) => (cl.exposure_likely ?? 0) > 0)
                  .map((cl) => {
                    const pct = totalExposure > 0 ? ((cl.exposure_likely ?? 0) / totalExposure) * 100 : 0;
                    const bar = severityColor[cl.severity] ?? "bg-primary";
                    return (
                      <div key={cl.id}>
                        <div className="flex items-center justify-between text-[13px] md:text-sm mb-1.5 gap-2">
                          <span className="text-foreground/90 truncate">{cl.title}</span>
                          <span
                            className="tabular-nums font-medium shrink-0"
                            title="Faixa estimada pela IA com base na cláusula identificada — não é um cálculo financeiro determinístico."
                          >
                            {fmtExposureRange(cl.exposure_min, cl.exposure_max, cl.exposure_likely)}
                          </span>
                        </div>
                        <div className="h-2 bg-muted/60 rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full", bar)} style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-[10px] md:text-[11px] text-muted-foreground mt-1 tabular-nums">{pct.toFixed(0)}% da exposição total</p>
                      </div>
                    );
                  })}
              </div>
            )}
          </SojCard>

          <div className="flex flex-col gap-4">
            <SojCard>
              <h4 className="text-sm font-medium mb-3">Comparativo de Impacto</h4>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="rounded-lg bg-risk-critical-dim p-3">
                  <p className="text-[10px] md:text-[11px] text-muted-foreground leading-tight">Sem ajustes</p>
                  <p className="text-base md:text-lg font-semibold text-risk-critical tabular-nums mt-1">
                    {fmtBRL(totalExposure)}
                  </p>
                </div>
                <div className="rounded-lg bg-primary-dim p-3">
                  <p className="text-[10px] md:text-[11px] text-muted-foreground leading-tight">Com sugestões</p>
                  <p className="text-base md:text-lg font-semibold text-primary tabular-nums mt-1">
                    {fmtBRL(Math.round(adjustedExposure))}
                  </p>
                </div>
              </div>
              {totalExposure > 0 && (
                <div className="rounded-lg bg-muted/40 px-3 py-2.5">
                  <p className="text-[11px] md:text-xs text-muted-foreground">
                    Redução estimada aplicando as sugestões:{" "}
                    <span className="font-semibold text-primary">
                      {fmtBRL(Math.round(totalExposure - adjustedExposure))}
                      {" "}({((1 - adjustedExposure / totalExposure) * 100).toFixed(0)}%)
                    </span>
                  </p>
                </div>
              )}
            </SojCard>

            <SojCard>
              <h4 className="text-sm font-medium mb-3">Índices Econômicos</h4>
              <dl className="text-[11px] md:text-xs space-y-2 divide-y divide-border">
                {[
                  [PARAMS_LABELS[0], `${indexes.ipca_12m.toFixed(2)}% a.a.`],
                  [PARAMS_LABELS[1], `${indexes.selic.toFixed(2)}% a.a.`],
                  [PARAMS_LABELS[2], "Valor contratual remanescente"],
                  [PARAMS_LABELS[3], "Vigência total do contrato"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between pt-2 first:pt-0">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="tabular-nums text-right">{v}</dd>
                  </div>
                ))}
              </dl>
              {indexes.fetched_at && (
                <p className="text-[9px] text-muted-foreground/50 mt-2">
                  Fonte: BCB · {new Date(indexes.fetched_at).toLocaleDateString("pt-BR")}
                </p>
              )}
            </SojCard>

            <FinancialSimulator
              contract={contract}
              totalExposure={totalExposure}
              onSave={saveContractValue}
            />

            <SojCard>
              <h4 className="text-sm font-medium mb-3">Parâmetros do Contrato</h4>
              <dl className="text-[11px] md:text-xs space-y-2 divide-y divide-border">
                {[
                  ["Tipo", contract.type ?? "—"],
                  ["Partes", contract.party ?? "—"],
                  ["Analisado em", fmtDate(analysis.analyzed_at)],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between pt-2 first:pt-0">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="tabular-nums text-right max-w-[55%] truncate">{v}</dd>
                  </div>
                ))}
              </dl>
            </SojCard>
          </div>
        </div>
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

// ─── main page ──────────────────────────────────────────────────────────────

export default function Analysis() {
  const navigate = useNavigate();
  const { id } = useParams();

  if (!id) {
    return (
      <div className="flex flex-col gap-4 md:gap-6 max-w-[1400px] mx-auto animate-fade-in">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Análise de Contratos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Selecione um contrato para visualizar a análise jurídica e financeira.
          </p>
        </div>
        <SojCard className="flex flex-col items-center gap-4 py-14 text-center">
          <div className="h-14 w-14 rounded-full bg-muted/40 flex items-center justify-center">
            <FileText className="h-7 w-7 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">Nenhum contrato selecionado</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Acesse a lista de contratos e clique em um para ver a análise detalhada.
            </p>
          </div>
          <button
            onClick={() => navigate("/contracts")}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Ver Contratos
          </button>
        </SojCard>
      </div>
    );
  }

  return <AnalysisView id={id} />;
}

function AnalysisView({ id }: { id: string }) {
  const navigate = useNavigate();
  const { contract, content, analysis, clauses, loading, notFound, refetch, triggerAnalysis, saveContractValue } = useContractAnalysis(id);
  const { indexes } = useEconomicIndexes();

  const [inAnaliseTab, setInAnaliseTab] = useState<"info" | "texto">("info");
  const [analisadoTab, setAnalisadoTab] = useState<"juridica" | "financeiro" | "texto">("juridica");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    const { error } = await triggerAnalysis();
    setAnalyzing(false);
    if (error) {
      const { toast } = await import("sonner");
      if (error.includes('ANTHROPIC_API_KEY') || error.includes('api_key')) {
        toast.error("Chave da API não configurada. Configure ANTHROPIC_API_KEY no Supabase.");
      } else {
        toast.error(`Erro na análise: ${error}`);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !contract) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <p className="font-medium">Contrato não encontrado</p>
        <button
          onClick={() => navigate("/contracts")}
          className="text-sm text-primary hover:underline"
        >
          Voltar para Contratos
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6 max-w-[1400px] mx-auto animate-fade-in">
      {/* Mobile header */}
      <div className="md:hidden flex items-start gap-2">
        <button
          onClick={() => navigate("/contracts")}
          className="text-xs text-muted-foreground active:opacity-70 -ml-1 px-1 py-1"
          style={{ minHeight: 44, minWidth: 32 }}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-[15px] font-bold tracking-tight truncate">{contract.name}</h1>
          <p className="text-[10px] text-muted-foreground truncate">
            {contract.party && `${contract.party} · `}{contract.type ?? contract.status}
          </p>
        </div>
      </div>

      {/* Desktop header */}
      <div className="hidden md:flex flex-wrap items-start justify-between gap-4">
        <div>
          <button
            onClick={() => navigate("/contracts")}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft className="h-3 w-3" /> Voltar para Contratos
          </button>
          <h1 className="text-2xl font-semibold tracking-tight">{contract.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {[contract.party, contract.type, `Enviado em ${fmtDate(contract.created_at)}`]
              .filter(Boolean).join(" · ")}
          </p>
        </div>
        {contract.status !== "aguardando" && (
          <button
            onClick={refetch}
            className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border text-sm hover:bg-muted/40 transition-colors"
          >
            Atualizar
          </button>
        )}
      </div>

      {/* Status-based views */}
      {contract.status === "aguardando" && (
        <AguardandoView contract={contract} />
      )}

      {contract.status === "em_analise" && (
        <InAnaliseView
          contract={contract}
          content={content}
          tab={inAnaliseTab}
          setTab={setInAnaliseTab}
          onAnalyze={handleAnalyze}
          analyzing={analyzing}
        />
      )}

      {contract.status === "analisado" && analysis && contract.org_id && (
        <AnalysisFeedbackPrompt analysisId={analysis.id} orgId={contract.org_id} />
      )}

      {contract.status === "analisado" && analysis && (
        <AnalisadoView
          contract={contract}
          content={content}
          analysis={analysis}
          clauses={clauses}
          tab={analisadoTab}
          setTab={setAnalisadoTab}
          expanded={expanded}
          setExpanded={setExpanded}
          indexes={indexes}
          saveContractValue={saveContractValue}
        />
      )}

      {/* Fallback for unknown status */}
      {!["aguardando", "em_analise", "analisado"].includes(contract.status) && (
        <SojCard className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-sm text-muted-foreground">Status desconhecido: {contract.status}</p>
        </SojCard>
      )}
    </div>
  );
}
