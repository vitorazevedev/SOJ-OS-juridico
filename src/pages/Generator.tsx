import { useEffect, useMemo, useState } from "react";
import { Check, History } from "lucide-react";
import { HistoryTab } from "@/components/generator/HistoryTab";
import { TemplateStep } from "@/components/generator/TemplateStep";
import { DynamicFieldsStep } from "@/components/generator/DynamicFieldsStep";
import { PreviewStep } from "@/components/generator/PreviewStep";
import { SuccessStep } from "@/components/generator/SuccessStep";
import { SendForSignatureDialog } from "@/components/generator/SendForSignatureDialog";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { saveGeneratedContract } from "@/hooks/useGeneratedContracts";
import { useOrganization } from "@/hooks/useOrganization";
import { PlanFeatureLock } from "@/components/layout/PlanFeatureLock";
import { CONTRACT_TEMPLATES_CATALOG, findContractTemplate } from "@/data/contractTemplatesCatalog";
import { CONTRACT_TEMPLATE_FIELDS } from "@/data/contractTemplateFields";
import { renderContractDocx, extractPlainTextFromDocx } from "@/lib/contractTemplateEngine";
import { emptyFieldValues } from "@/lib/dynamicContractForm";
import { slugifyName, parseValueToCents } from "@/lib/generatorForm";

const STEPS = ["Tipo de Contrato", "Informações", "Revisar", "Concluído"];

export default function Generator() {
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [contractName, setContractName] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [scopeConfirmed, setScopeConfirmed] = useState(false);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedRecord, setSavedRecord] = useState<{
    id: string;
    filePath: string;
    signedUrl: string | null;
  } | null>(null);
  const [signOpen, setSignOpen] = useState(false);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"novo" | "historico">("novo");
  const { org, loading: orgLoading } = useOrganization();

  const tpl = useMemo(
    () => findContractTemplate(selected ?? "") ?? CONTRACT_TEMPLATES_CATALOG[0],
    [selected],
  );
  const fields = useMemo(() => CONTRACT_TEMPLATE_FIELDS[tpl.id] ?? [], [tpl.id]);

  const reset = () => {
    setStep(1);
    setSelected(null);
    setContractName("");
    setValues({});
    setErrors({});
    setScopeConfirmed(false);
    setPreviewBlob(null);
    setPreviewError(null);
    setSavedRecord(null);
  };

  // Renderiza o DOCX real (com as tabelas dos Anexos) ao entrar na etapa de
  // revisão — os valores não mudam mais depois disso, então só roda uma vez
  // por entrada nessa etapa.
  useEffect(() => {
    if (step !== 3) return;
    let cancelled = false;
    setPreviewBlob(null);
    setPreviewError(null);
    renderContractDocx(tpl.templateUrl, values)
      .then((blob) => { if (!cancelled) setPreviewBlob(blob); })
      .catch(() => { if (!cancelled) setPreviewError("Não foi possível gerar o documento. Tente novamente."); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, tpl.id]);

  const handleSelectTemplate = (id: string) => {
    setSelected(id);
    setValues(emptyFieldValues(CONTRACT_TEMPLATE_FIELDS[id] ?? []));
  };

  const handleGenerate = async () => {
    if (!previewBlob) return;
    setSaving(true);
    try {
      const contentText = await extractPlainTextFromDocx(previewBlob);
      const valueCents = parseValueToCents(values.VALOR ?? "");
      const slug = slugifyName(contractName);
      const result = await saveGeneratedContract({
        templateId: tpl.id,
        name: contractName.trim(),
        partyA: values.PARTE_A_RAZAO_SOCIAL ?? "",
        partyB: values.PARTE_B_RAZAO_SOCIAL ?? "",
        valueCents,
        termDays: null,
        sector: "",
        docxBlob: previewBlob,
        contentText,
        preRiskScore: 18,
      });
      const { downloadBlob } = await import("@/lib/contractDocs");
      downloadBlob(previewBlob, `${slug}.docx`);
      setSavedRecord(result);
      setStep(4);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Tente novamente.";
      toast({ title: "Erro ao salvar contrato", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleCopyText = async () => {
    if (!previewBlob) return;
    const text = await extractPlainTextFromDocx(previewBlob);
    await navigator.clipboard.writeText(text);
    toast({ title: "Texto copiado!" });
  };

  if (!orgLoading && org?.plan_status !== "active") {
    return (
      <PlanFeatureLock
        feature="O Gerador de Contrato"
        description="Crie contratos equilibrados e juridicamente seguros com os modelos da biblioteca jurídica Ponderum. Disponível para quem tem o plano Starter."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6 max-w-[1100px] mx-auto animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg md:text-2xl font-semibold tracking-tight">Gerar Contrato</h1>
          <p className="hidden md:block text-sm text-muted-foreground mt-1">
            Gere contratos a partir da biblioteca jurídica Ponderum, com revisão de escopo antes de baixar
          </p>
        </div>
        <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
          {(["novo", "historico"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "h-9 px-3 md:px-4 text-xs md:text-sm flex items-center gap-1.5 transition-colors",
                activeTab === tab
                  ? "bg-primary text-black font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
              )}
            >
              {tab === "historico" && <History className="h-3.5 w-3.5" />}
              {tab === "novo" ? "Novo Contrato" : "Histórico"}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "historico" && <HistoryTab />}

      {activeTab === "novo" && (<>
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const idx = i + 1;
          const done = step > idx;
          const active = step === idx;
          return (
            <div key={s} className="flex items-center gap-2 flex-1 last:flex-none">
              <div className="flex items-center gap-2">
                <span
                  className="h-6 w-6 md:h-7 md:w-7 rounded-full flex items-center justify-center text-[11px] md:text-xs font-bold transition-all"
                  style={
                    done || active
                      ? { background: "#00e5a0", color: "#000" }
                      : { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.3)" }
                  }
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : idx}
                </span>
                <span
                  className={cn(
                    "text-[11px] md:text-xs",
                    active ? "text-foreground font-medium" : "text-muted-foreground hidden md:inline",
                  )}
                >
                  {active ? s : <span className="hidden md:inline">{s}</span>}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className="flex-1 h-px"
                  style={{ background: done ? "#00e5a0" : "rgba(255,255,255,0.08)" }}
                />
              )}
            </div>
          );
        })}
      </div>

      {step === 1 && (
        <TemplateStep selected={selected} onSelect={handleSelectTemplate} onNext={() => setStep(2)} />
      )}

      {step === 2 && (
        <DynamicFieldsStep
          tpl={tpl}
          fields={fields}
          contractName={contractName}
          setContractName={setContractName}
          values={values}
          setValues={setValues}
          errors={errors}
          setErrors={setErrors}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}

      {step === 3 && (
        <PreviewStep
          tpl={tpl}
          docxBlob={previewBlob}
          previewError={previewError}
          saving={saving}
          scopeConfirmed={scopeConfirmed}
          setScopeConfirmed={setScopeConfirmed}
          onBack={() => setStep(2)}
          onCopy={handleCopyText}
          onGenerate={handleGenerate}
        />
      )}

      {step === 4 && (
        <SuccessStep onReset={reset} onSignClick={() => setSignOpen(true)} />
      )}

      </>)}

      <SendForSignatureDialog
        open={signOpen}
        onClose={() => setSignOpen(false)}
        savedRecord={savedRecord}
      />
    </div>
  );
}
