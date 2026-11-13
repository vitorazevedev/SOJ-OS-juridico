import { SojCard } from "@/components/layout/Primitives";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatDocument } from "@/lib/brazilianDocs";
import { inputCls } from "@/lib/generatorForm";
import {
  CONTRACT_FIELD_DICTIONARY,
  CONTRACT_FIELD_GROUP_LABELS,
  LGPD_ROLE_OPTIONS,
  resolvePartySelectOptions,
  type ContractFieldGroup,
} from "@/lib/contractFieldDictionary";
import { PARTY_IDENTITY_FIELDS, partyBlockLabel, contractNameSchema, validateDynamicFields } from "@/lib/dynamicContractForm";
import type { ContractTemplate } from "@/data/contractTemplatesCatalog";

const FIELD_GROUP_ORDER: ContractFieldGroup[] = [
  "objeto_escopo", "confidencialidade", "produto_logistica", "parceria", "consultoria", "comercial",
  "sla_aceite", "dados_lgpd", "responsabilidade", "controversias", "assinatura",
];

export function DynamicFieldsStep({
  tpl,
  fields,
  contractName,
  setContractName,
  values,
  setValues,
  errors,
  setErrors,
  onBack,
  onNext,
}: {
  tpl: ContractTemplate;
  fields: string[];
  contractName: string;
  setContractName: (v: string) => void;
  values: Record<string, string>;
  setValues: (updater: (prev: Record<string, string>) => Record<string, string>) => void;
  errors: Record<string, string>;
  setErrors: (errors: Record<string, string>) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const setField = (field: string, v: string) => setValues((prev) => ({ ...prev, [field]: v }));

  const handleDocChange = (field: string, raw: string) => {
    const formatted = formatDocument(raw);
    setField(field, formatted);
  };

  const otherFields = fields.filter((f) => !PARTY_IDENTITY_FIELDS.includes(f as (typeof PARTY_IDENTITY_FIELDS)[number]));
  const grouped = FIELD_GROUP_ORDER.map((group) => ({
    group,
    fields: otherFields.filter((f) => CONTRACT_FIELD_DICTIONARY[f]?.group === group),
  })).filter((g) => g.fields.length > 0);

  const nameError = errors.__name;

  const handleContinue = () => {
    const fieldErrors = validateDynamicFields(fields, values);
    const nameResult = contractNameSchema().safeParse(contractName);
    if (!nameResult.success) fieldErrors.__name = nameResult.error.issues[0]?.message ?? "Campo obrigatório";
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length === 0) onNext();
  };

  const renderField = (field: string) => {
    const def = CONTRACT_FIELD_DICTIONARY[field];
    if (!def) return null;
    const value = values[field] ?? "";
    const error = errors[field];

    const label = (
      <label className="text-[11px] md:text-xs text-muted-foreground">
        {def.label} <span className="text-destructive">*</span>
      </label>
    );

    if (def.type === "party-select" || def.type === "lgpd-role-select") {
      const options = def.type === "lgpd-role-select"
        ? [...LGPD_ROLE_OPTIONS]
        : resolvePartySelectOptions(tpl.parteA, tpl.parteB);
      return (
        <div key={field} className="flex flex-col gap-1.5">
          {label}
          <Select value={value} onValueChange={(v) => setField(field, v)}>
            <SelectTrigger className={cn(error && "border-destructive/70")} style={{ minHeight: 44 }}>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {error && <p className="text-[10px] text-destructive">{error}</p>}
        </div>
      );
    }

    if (def.type === "textarea") {
      return (
        <div key={field} className="flex flex-col gap-1.5 md:col-span-2">
          {label}
          <textarea
            value={value}
            onChange={(e) => setField(field, e.target.value)}
            placeholder={def.placeholder}
            rows={3}
            className={cn(inputCls, error && "border-destructive/70 focus:border-destructive")}
            style={{ padding: "11px 12px" }}
          />
          {error && <p className="text-[10px] text-destructive">{error}</p>}
        </div>
      );
    }

    return (
      <div key={field} className="flex flex-col gap-1.5">
        {label}
        <input
          type={def.type === "date" ? "date" : "text"}
          value={value}
          onChange={(e) => setField(field, e.target.value)}
          placeholder={def.placeholder}
          className={cn(inputCls, error && "border-destructive/70 focus:border-destructive")}
          style={{ padding: "11px 12px", minHeight: 44 }}
        />
        {error && <p className="text-[10px] text-destructive">{error}</p>}
      </div>
    );
  };

  return (
    <SojCard className="flex flex-col gap-4">
      <h3 className="font-medium text-sm md:text-base">Informações do Contrato</h3>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] md:text-xs text-muted-foreground">
            Nome do Contrato <span className="text-destructive">*</span>
          </label>
          <input
            value={contractName}
            onChange={(e) => setContractName(e.target.value)}
            placeholder={`Ex: ${tpl.titulo} — Fornecedor XYZ`}
            className={cn(inputCls, nameError && "border-destructive/70 focus:border-destructive")}
            style={{ padding: "11px 12px", minHeight: 44 }}
            maxLength={120}
          />
          {nameError && <p className="text-[10px] text-destructive">{nameError}</p>}
        </div>

        {(["A", "B"] as const).map((side) => {
          const prefix = `PARTE_${side}`;
          return (
            <div key={side} className="flex flex-col gap-2">
              <p className={cn(
                "text-[11px] md:text-xs font-medium uppercase tracking-wide",
                side === "A" ? "text-primary/80" : "text-muted-foreground",
              )}>
                {partyBlockLabel(tpl, side)}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[`${prefix}_RAZAO_SOCIAL`, `${prefix}_CNPJ`, `${prefix}_ENDERECO`].map((field) => {
                  const def = CONTRACT_FIELD_DICTIONARY[field];
                  const error = errors[field];
                  return (
                    <div key={field} className="flex flex-col gap-1.5">
                      <label className="text-[11px] md:text-xs text-muted-foreground">
                        {def.label} <span className="text-destructive">*</span>
                      </label>
                      <input
                        value={values[field] ?? ""}
                        onChange={(e) => (
                          def.type === "document"
                            ? handleDocChange(field, e.target.value)
                            : setField(field, e.target.value)
                        )}
                        placeholder={def.placeholder}
                        className={cn(inputCls, error && "border-destructive/70 focus:border-destructive")}
                        style={{ padding: "11px 12px", minHeight: 44 }}
                        inputMode={def.type === "document" ? "numeric" : undefined}
                      />
                      {error && <p className="text-[10px] text-destructive">{error}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {grouped.map(({ group, fields: groupFields }) => (
          <div key={group} className="flex flex-col gap-2">
            <p className="text-[11px] md:text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {CONTRACT_FIELD_GROUP_LABELS[group]}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {groupFields.map(renderField)}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between gap-2 pt-2">
        <button
          onClick={onBack}
          className="h-11 md:h-10 px-5 rounded-lg border border-border text-sm hover:bg-muted/40 active:opacity-70 transition-colors"
        >
          ← Voltar
        </button>
        <button
          onClick={handleContinue}
          className="h-11 md:h-10 px-6 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 active:opacity-80 transition-opacity"
        >
          Pré-visualizar →
        </button>
      </div>
    </SojCard>
  );
}
