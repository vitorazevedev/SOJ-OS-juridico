import { cn } from "@/lib/utils";
import { SojCard } from "@/components/layout/Primitives";
import { FinancialSimulator } from "@/features/analysis/components/FinancialSimulator";
import {
  fmtBRL, fmtDate, fmtExposureRange, severityColor, SEV_REDUCTION, PARAMS_LABELS,
} from "@/lib/analysisFormat";
import { useEconomicIndexes } from "@/hooks/useEconomicIndexes";
import type { FullContract, ContractAnalysis, ClauseRisk } from "@/hooks/useContractAnalysis";

export function FinanceiroTab({
  contract,
  analysis,
  clauses,
  indexes,
  saveContractValue,
}: {
  contract: FullContract;
  analysis: ContractAnalysis;
  clauses: ClauseRisk[];
  indexes: ReturnType<typeof useEconomicIndexes>["indexes"];
  saveContractValue: (v: number) => Promise<void>;
}) {
  const totalExposure = clauses.reduce((s, cl) => s + (cl.exposure_likely ?? 0), 0);
  const adjustedExposure = clauses.reduce((s, cl) => {
    const reduction = SEV_REDUCTION[cl.severity] ?? 0;
    return s + (cl.exposure_likely ?? 0) * (1 - reduction);
  }, 0);

  return (
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
  );
}
