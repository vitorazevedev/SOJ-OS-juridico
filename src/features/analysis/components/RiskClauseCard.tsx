import { useState } from "react";
import { AlertTriangle, CheckCircle2, Copy, ExternalLink, Info, Pencil } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { gravidadeFaixa, stripMarkdown } from "@/lib/analysisFormat";
import type { ClauseRisk, ReviewStatus } from "@/hooks/useContractAnalysis";

const REVIEW_LABELS: Record<ReviewStatus, string> = {
  revisado: "Revisado",
  ajustado: "Ajustado",
  descartado: "Descartado",
  mantido_pelo_usuario: "Mantido pelo usuário",
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

// Linha compacta na lista de achados — clicar seleciona a cláusula pro painel
// de detalhe ao lado (layout master-detail, Fase 5).
export function ClauseListItem({
  clause,
  selected,
  onSelect,
}: {
  clause: ClauseRisk;
  selected: boolean;
  onSelect: () => void;
}) {
  const isQualitative = clause.finding_type === "qualitative_unmapped";
  const faixa = !isQualitative && clause.gravidade != null ? gravidadeFaixa(clause.gravidade) : null;

  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full flex items-start gap-3 px-4 py-3 text-left border-l-2 transition-colors",
        selected ? "border-l-primary bg-primary-dim" : "border-l-transparent hover:bg-muted/30"
      )}
      style={{ minHeight: 44 }}
    >
      <div className="text-center shrink-0 w-10">
        {isQualitative ? (
          <Info className="h-5 w-5 text-info mx-auto" />
        ) : (
          <>
            <p className={cn("text-xl font-semibold tabular-nums leading-none", faixa?.text ?? "text-foreground")}>
              {clause.gravidade != null ? Math.round(clause.gravidade) : "—"}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">de 100</p>
          </>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] leading-snug">{clause.title}</p>
        {clause.category && (
          <p className="text-[11px] text-muted-foreground mt-0.5">{clause.category}</p>
        )}
        <div className="flex items-center gap-1.5 mt-1">
          {isQualitative ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-info/15 text-info">
              Alerta qualitativo
            </span>
          ) : faixa && (
            <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-medium", faixa.bg, faixa.text)}>
              {faixa.label}
            </span>
          )}
          <span className="text-[11px] text-muted-foreground">
            · {clause.review_status ? REVIEW_LABELS[clause.review_status] : "Não revisado"}
          </span>
        </div>
      </div>
    </button>
  );
}

// Painel de detalhe fixo pra cláusula selecionada — sem toggle, sempre visível
// (coluna direita do layout master-detail, Fase 5).
export function ClauseDetailPanel({
  clause,
  onViewInContract,
  updateClauseReview,
  updateClauseSuggestion,
}: {
  clause: ClauseRisk;
  onViewInContract: () => void;
  updateClauseReview: (clauseId: string, status: ReviewStatus) => Promise<void>;
  updateClauseSuggestion: (clauseId: string, suggestion: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draftSuggestion, setDraftSuggestion] = useState(clause.suggestion ?? "");
  const [copied, setCopied] = useState(false);

  const isQualitative = clause.finding_type === "qualitative_unmapped";
  const gravidade = clause.gravidade;
  const faixa = !isQualitative && gravidade != null ? gravidadeFaixa(gravidade) : null;

  const handleCopy = async () => {
    if (!clause.suggestion) return;
    await navigator.clipboard.writeText(clause.suggestion);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSaveSuggestion = async () => {
    await updateClauseSuggestion(clause.id, draftSuggestion);
    setEditing(false);
  };

  return (
    <div className="grid gap-3 p-4 md:p-5">
      <div>
        <p className="text-[12px] text-muted-foreground uppercase tracking-wider">
          {clause.category ?? "Cláusula"}
        </p>
        <h3 className="text-lg md:text-xl font-medium mt-0.5">{clause.title}</h3>
      </div>

      {isQualitative ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[13px] font-medium bg-info/15 text-info">
            <Info className="h-3.5 w-3.5" /> Alerta qualitativo
          </span>
          <span className="text-[11px] text-muted-foreground">
            {clause.review_status ? REVIEW_LABELS[clause.review_status] : "Ainda não revisado"}
          </span>
        </div>
      ) : faixa && (
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[13px] font-medium", faixa.bg, faixa.text)}>
            {faixa.label}
          </span>
          <span className="text-[13px] text-muted-foreground">Índice {Math.round(gravidade!)} de 100</span>
          <span className="text-[11px] text-muted-foreground">
            {clause.review_status ? REVIEW_LABELS[clause.review_status] : "Ainda não revisado"}
          </span>
        </div>
      )}

      {isQualitative && clause.gating_reason && (
        <div className="rounded-lg border border-info/20 bg-info/10 p-3 md:p-4">
          <p className="text-[12px] font-medium text-info uppercase tracking-wider mb-1.5">Por que não entra no índice</p>
          <p className="text-[13px] md:text-sm text-foreground/90">{clause.gating_reason}</p>
        </div>
      )}

      {!isQualitative && gravidade != null && (
        <div className="rounded-lg border border-border p-3 md:p-4">
          <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Índice de Desequilíbrio</p>
          <div className="text-center mb-2">
            <p className="text-[11px] text-muted-foreground">Leitura desta cláusula</p>
            <p className="text-xl font-semibold tabular-nums">{Math.round(gravidade)}</p>
          </div>
          {clause.polaridade_parte_representada != null && (() => {
            const voce = clause.polaridade_parte_representada!;
            const contraparte = 100 - voce;
            // Cor da régua reflete a gravidade da cláusula (a mesma do badge "Risco
            // X" acima), não o quanto o desequilíbrio pende pra um lado — antes usava
            // a própria polaridade como se fosse o índice, então uma cláusula de
            // risco baixo com pendência 50/50 saía colorida como "médio" (amarelo).
            const zonaCor = gravidadeFaixa(gravidade).dot;
            return (
              <div>
                <p className="text-[12px] md:text-[13px] text-foreground/90">
                  Distribuição estimada do impacto: <span className="font-semibold">{Math.round(voce)}%</span> para você e{" "}
                  <span className="font-semibold">{Math.round(contraparte)}%</span> para a contraparte.
                </p>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground mt-2.5 mb-1.5">
                  <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-risk-low shrink-0" /> Baixo · 0 a 29</span>
                  <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-risk-medium shrink-0" /> Médio · 30 a 59</span>
                  <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-risk-high shrink-0" /> Alto · 60 a 79</span>
                  <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-risk-critical shrink-0" /> Crítico · 80 a 100</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="flex-1 h-2 rounded-l-full bg-muted flex justify-end overflow-hidden">
                    <div className={cn("h-full", zonaCor)} style={{ width: `${voce}%` }} />
                  </div>
                  <div className="flex-1 h-2 rounded-r-full bg-muted overflow-hidden">
                    <div className={cn("h-full", zonaCor)} style={{ width: `${contraparte}%` }} />
                  </div>
                </div>
                <div className="flex text-[11px] text-muted-foreground/70 mt-1 tabular-nums">
                  <div className="flex-1 flex justify-between">
                    {[100, 75, 50, 25, 0].map((t) => <span key={`v${t}`}>{t}</span>)}
                  </div>
                  <div className="w-1.5" />
                  <div className="flex-1 flex justify-between">
                    {[0, 25, 50, 75, 100].map((t) => <span key={`c${t}`}>{t}</span>)}
                  </div>
                </div>
                <div className="flex justify-between text-[11px] font-medium text-muted-foreground mt-0.5">
                  <span>VOCÊ</span>
                  <span>CONTRAPARTE</span>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {clause.conclusao && (
        <div className="rounded-lg bg-muted/40 p-3 md:p-4">
          <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Conclusão</p>
          <p className="text-[13px] md:text-sm leading-relaxed text-foreground/90">{clause.conclusao}</p>
        </div>
      )}

      {clause.original_text && (
        <div className="rounded-lg border border-risk-critical/20 bg-risk-critical-dim p-3 md:p-4">
          <p className="text-[12px] md:text-[13px] font-medium text-risk-critical flex items-center gap-1.5 mb-2">
            <AlertTriangle className="h-3.5 w-3.5" /> Original (Risco)
          </p>
          <p className="text-[13px] md:text-sm leading-relaxed text-foreground/90">{stripMarkdown(clause.original_text)}</p>
        </div>
      )}

      {clause.impacto_identificado && clause.impacto_identificado.length > 0 && (
        <div className="rounded-lg bg-muted/40 p-3 md:p-4">
          <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Impacto identificado</p>
          <ul className="list-disc list-inside space-y-1">
            {clause.impacto_identificado.map((item, i) => (
              <li key={i} className="text-[13px] md:text-sm text-foreground/90">{item}</li>
            ))}
          </ul>
        </div>
      )}

      {clause.exposure_likely != null && clause.exposure_likely > 0 && (
        <div className="rounded-lg bg-muted/40 p-3 md:p-4">
          <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Exposição estimada</p>
          <p className="text-xl font-semibold tabular-nums">
            {fmtExposureRange(clause.exposure_min, clause.exposure_max, clause.exposure_likely)}
          </p>
        </div>
      )}

      {clause.mitigacao && (
        <div className="rounded-lg bg-muted/40 p-3 md:p-4">
          <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Possível mitigação</p>
          <p className="text-[13px] md:text-sm text-foreground/90">{clause.mitigacao}</p>
        </div>
      )}

      {editing ? (
        <div className="rounded-lg border border-primary/20 bg-primary-dim p-3 md:p-4 grid gap-2">
          <p className="text-[12px] md:text-[13px] font-medium text-primary flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" /> Sugestão de redação
          </p>
          <Textarea
            value={draftSuggestion}
            onChange={(e) => setDraftSuggestion(e.target.value)}
            className="text-[13px] md:text-sm bg-background"
            rows={4}
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setDraftSuggestion(clause.suggestion ?? ""); setEditing(false); }}
              className="h-8 px-3 rounded-lg text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveSuggestion}
              className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-[13px] font-medium hover:opacity-90 transition-opacity"
            >
              Salvar
            </button>
          </div>
        </div>
      ) : (
        clause.suggestion && (
          <div className="rounded-lg border border-primary/20 bg-primary-dim p-3 md:p-4">
            <p className="text-[12px] md:text-[13px] font-medium text-primary flex items-center gap-1.5 mb-2">
              <CheckCircle2 className="h-3.5 w-3.5" /> Sugestão de redação
            </p>
            <p className="text-[13px] md:text-sm leading-relaxed text-foreground/90">{clause.suggestion}</p>
          </div>
        )
      )}

      {gravidade != null && (clause.score_simetria != null || clause.score_valor_exposto != null) && (
        <details className="rounded-lg border border-border p-3 md:p-4">
          <summary className="text-[12px] md:text-[13px] font-medium cursor-pointer text-foreground/90">
            Entenda como o índice foi calculado
          </summary>
          <div className="grid gap-2.5 mt-3">
            {([
              ["Simetria entre as partes", clause.score_simetria, 40],
              ["Valor exposto", clause.score_valor_exposto, 30],
              ["Prazo e reversibilidade", clause.score_prazo_reversibilidade, 20],
              ["Foro e execução", clause.score_foro_execucao, 10],
            ] as const).map(([label, value, max]) => (
              <div key={label}>
                <div className="flex justify-between text-[12px] mb-1">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="tabular-nums font-medium">{value != null ? Math.round(value) : 0}/{max}</span>
                </div>
                <Progress value={value != null ? (value / max) * 100 : 0} className="h-1.5" />
              </div>
            ))}
          </div>
        </details>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {clause.suggestion && !editing && (
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          >
            <Copy className="h-3.5 w-3.5" /> {copied ? "Copiado!" : "Copiar sugestão"}
          </button>
        )}
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" /> Editar redação
          </button>
        )}
        <button
          onClick={onViewInContract}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Ver no contrato
        </button>
        <div className="flex-1" />
        {(["revisado", "ajustado", "descartado", "mantido_pelo_usuario"] as const).map((status) => (
          <button
            key={status}
            onClick={() => updateClauseReview(clause.id, status)}
            className={cn(
              "h-8 px-3 rounded-lg text-[13px] font-medium transition-colors",
              clause.review_status === status
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40"
            )}
          >
            {REVIEW_LABELS[status]}
          </button>
        ))}
      </div>
    </div>
  );
}
