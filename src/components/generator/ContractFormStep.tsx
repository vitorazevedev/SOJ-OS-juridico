import { SojCard } from "@/components/layout/Primitives";
import { cn } from "@/lib/utils";
import { formatDocument } from "@/lib/brazilianDocs";
import { contractFormSchema, inputCls, validateForm, type FormErrors, type FormState } from "@/lib/generatorForm";
import type { Template } from "@/data/soj";

export function ContractFormStep({
  form,
  setForm,
  errors,
  setErrors,
  tpl,
  onBack,
  onNext,
}: {
  form: FormState;
  setForm: (updater: (prev: FormState) => FormState) => void;
  errors: FormErrors;
  setErrors: (errors: FormErrors) => void;
  tpl: Template;
  onBack: () => void;
  onNext: () => void;
}) {
  const handleDocChange = (field: "cnpjA" | "cnpjB", raw: string) => {
    const formatted = formatDocument(raw);
    setForm((prev) => ({ ...prev, [field]: formatted }));
    const fieldResult = contractFormSchema.shape[field].safeParse(formatted);
    setErrors({ ...errors, [field]: fieldResult.success ? undefined : fieldResult.error.issues[0]?.message });
  };

  const handleContinue = () => {
    const validationErrors = validateForm(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length === 0) onNext();
  };

  return (
    <SojCard className="flex flex-col gap-4">
      <h3 className="font-medium text-sm md:text-base">Informações do Contrato</h3>
      <div className="flex flex-col gap-4">
        {/* Nome do contrato */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] md:text-xs text-muted-foreground">
            Nome do Contrato <span className="text-destructive">*</span>
          </label>
          <input
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Ex: NDA com Fornecedor XYZ, Contrato de Serviços ABC 2026..."
            className={cn(inputCls, errors.name && "border-destructive/70 focus:border-destructive")}
            style={{ padding: "11px 12px", minHeight: 44 }}
            required
            maxLength={120}
          />
          {errors.name && <p className="text-[10px] text-destructive">{errors.name}</p>}
        </div>

        {/* Parte A */}
        <div className="flex flex-col gap-2">
          <p className="text-[11px] md:text-xs font-medium text-primary/80 uppercase tracking-wide">
            Parte A — Contratante
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] md:text-xs text-muted-foreground">Nome / Razão Social</label>
              <input
                value={form.partyA}
                onChange={(e) => setForm((prev) => ({ ...prev, partyA: e.target.value }))}
                placeholder="Sua empresa LTDA"
                className={inputCls}
                style={{ padding: "11px 12px", minHeight: 44 }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] md:text-xs text-muted-foreground">CNPJ / CPF</label>
              <input
                value={form.cnpjA}
                onChange={(e) => handleDocChange("cnpjA", e.target.value)}
                placeholder="00.000.000/0001-00"
                className={cn(inputCls, errors.cnpjA && "border-destructive/70 focus:border-destructive")}
                style={{ padding: "11px 12px", minHeight: 44 }}
                inputMode="numeric"
              />
              {errors.cnpjA && (
                <p className="text-[10px] text-destructive">{errors.cnpjA}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] md:text-xs text-muted-foreground">Cidade / Estado</label>
              <input
                value={form.cityA}
                onChange={(e) => setForm((prev) => ({ ...prev, cityA: e.target.value }))}
                placeholder="São Paulo/SP"
                className={inputCls}
                style={{ padding: "11px 12px", minHeight: 44 }}
              />
            </div>
          </div>
        </div>

        {/* Parte B */}
        <div className="flex flex-col gap-2">
          <p className="text-[11px] md:text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Parte B — Contratado
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] md:text-xs text-muted-foreground">Nome / Razão Social</label>
              <input
                value={form.partyB}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    partyB: val,
                    name: !prev.name.trim() && val.trim() ? `${tpl.title} — ${val.trim()}` : prev.name,
                  }));
                }}
                placeholder="Fornecedor ABC LTDA"
                className={inputCls}
                style={{ padding: "11px 12px", minHeight: 44 }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] md:text-xs text-muted-foreground">CNPJ / CPF</label>
              <input
                value={form.cnpjB}
                onChange={(e) => handleDocChange("cnpjB", e.target.value)}
                placeholder="00.000.000/0001-00"
                className={cn(inputCls, errors.cnpjB && "border-destructive/70 focus:border-destructive")}
                style={{ padding: "11px 12px", minHeight: 44 }}
                inputMode="numeric"
              />
              {errors.cnpjB && (
                <p className="text-[10px] text-destructive">{errors.cnpjB}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] md:text-xs text-muted-foreground">Cidade / Estado</label>
              <input
                value={form.cityB}
                onChange={(e) => setForm((prev) => ({ ...prev, cityB: e.target.value }))}
                placeholder="Rio de Janeiro/RJ"
                className={inputCls}
                style={{ padding: "11px 12px", minHeight: 44 }}
              />
            </div>
          </div>
        </div>

        {/* Detalhes do contrato */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] md:text-xs text-muted-foreground">Valor Total (R$)</label>
            <input
              value={form.value}
              onChange={(e) => setForm((prev) => ({ ...prev, value: e.target.value }))}
              placeholder="Ex: 120.000,00"
              className={inputCls}
              style={{ padding: "11px 12px", minHeight: 44 }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] md:text-xs text-muted-foreground">Prazo de Vigência</label>
            <input
              value={form.term}
              onChange={(e) => setForm((prev) => ({ ...prev, term: e.target.value }))}
              placeholder="Ex: 12 meses, 1 ano, indeterminado..."
              className={inputCls}
              style={{ padding: "11px 12px", minHeight: 44 }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] md:text-xs text-muted-foreground">Setor de Atuação</label>
            <input
              value={form.sector}
              onChange={(e) => setForm((prev) => ({ ...prev, sector: e.target.value }))}
              placeholder="Ex: Tecnologia, Saúde, Varejo..."
              className={inputCls}
              style={{ padding: "11px 12px", minHeight: 44 }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] md:text-xs text-muted-foreground">Foro (cidade para disputas)</label>
            <input
              value={form.foro}
              onChange={(e) => setForm((prev) => ({ ...prev, foro: e.target.value }))}
              placeholder="Ex: São Paulo/SP"
              className={inputCls}
              style={{ padding: "11px 12px", minHeight: 44 }}
            />
          </div>
        </div>

        {/* Observações */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] md:text-xs text-muted-foreground">Observações</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="Cláusulas específicas, requisitos especiais..."
            className={inputCls}
            rows={3}
            style={{ padding: "11px 12px" }}
          />
        </div>
      </div>
      <div className="flex justify-between gap-2 pt-2">
        <button
          onClick={onBack}
          className="h-11 md:h-10 px-5 rounded-lg border border-border text-sm hover:bg-muted/40 active:opacity-70 transition-colors"
        >
          ← Voltar
        </button>
        <button
          disabled={!form.name.trim() || !!errors.cnpjA || !!errors.cnpjB}
          onClick={handleContinue}
          className={cn(
            "h-11 md:h-10 px-6 rounded-lg text-sm font-medium transition-opacity",
            form.name.trim() && !errors.cnpjA && !errors.cnpjB
              ? "bg-primary text-primary-foreground hover:opacity-90 active:opacity-80"
              : "bg-muted text-muted-foreground cursor-not-allowed",
          )}
        >
          Pré-visualizar →
        </button>
      </div>
    </SojCard>
  );
}
