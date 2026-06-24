import { useState } from "react";
import type { useContractAnalysis } from "@/hooks/useContractAnalysis";

export function FinancialSimulator({
  contract,
  totalExposure,
  onSave,
}: {
  contract: NonNullable<ReturnType<typeof useContractAnalysis>["contract"]>;
  totalExposure: number;
  onSave: (value: number) => Promise<void>;
}) {
  const [raw, setRaw] = useState(
    contract.contract_value_informed != null
      ? String(contract.contract_value_informed)
      : ""
  );
  const [saving, setSaving] = useState(false);

  const parsedValue = parseFloat(raw.replace(/\./g, "").replace(",", "."));
  const isValid = !isNaN(parsedValue) && parsedValue > 0;
  const exposurePct = isValid && totalExposure > 0
    ? ((totalExposure / 100) / parsedValue * 100).toFixed(1)
    : null;

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);
    await onSave(parsedValue);
    setSaving(false);
  };

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4 flex flex-col gap-3">
      <div>
        <p className="text-sm font-medium">Simulador de Valor do Contrato</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Informe o valor real para calcular a exposição proporcional
        </p>
      </div>
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
          <input
            type="text"
            inputMode="decimal"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder="500.000,00"
            className="w-full h-9 pl-8 pr-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-primary/60 transition-colors"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={!isValid || saving}
          className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
        >
          {saving ? "Salvando..." : "Aplicar"}
        </button>
      </div>
      {isValid && exposurePct && (
        <div className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Exposição representa{" "}
          <span className="font-semibold text-foreground">{exposurePct}%</span>
          {" "}do valor informado
          {parseFloat(exposurePct) > 30 && (
            <span className="text-risk-critical font-medium"> — exposição elevada</span>
          )}
        </div>
      )}
      <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
        * Estimativa baseada nas cláusulas identificadas pela IA. Consulte um advogado para avaliação definitiva.
      </p>
    </div>
  );
}
