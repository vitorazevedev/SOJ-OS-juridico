import { useMemo, useState } from "react";
import { TEMPLATES } from "@/data/soj";
import { Check, History } from "lucide-react";
import { HistoryTab } from "@/components/generator/HistoryTab";
import { TemplateStep } from "@/components/generator/TemplateStep";
import { ContractFormStep } from "@/components/generator/ContractFormStep";
import { PreviewStep } from "@/components/generator/PreviewStep";
import { SuccessStep } from "@/components/generator/SuccessStep";
import { SendForSignatureDialog } from "@/components/generator/SendForSignatureDialog";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { saveGeneratedContract } from "@/hooks/useGeneratedContracts";
import { buildContractSections } from "@/lib/contractSections";
import { useOrganization } from "@/hooks/useOrganization";
import {
  STEPS,
  EMPTY_FORM,
  buildContractText,
  parseValueToCents,
  slugifyName,
  validateForm,
  type FormState,
  type FormErrors,
} from "@/lib/generatorForm";

export default function Generator() {
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [savedRecord, setSavedRecord] = useState<{
    id: string;
    filePath: string;
    signedUrl: string | null;
  } | null>(null);
  const [signOpen, setSignOpen] = useState(false);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"novo" | "historico">("novo");
  const { logoUrl } = useOrganization();

  const tpl = useMemo(
    () => TEMPLATES.find((t) => t.id === selected) ?? TEMPLATES[0],
    [selected],
  );

  const reset = () => {
    setStep(1);
    setSelected(null);
    setForm(EMPTY_FORM);
    setSavedRecord(null);
    setErrors({});
  };

  const handleGenerate = async () => {
    const validationErrors = validateForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast({ title: "Corrija os campos inválidos antes de gerar o contrato", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      // Carregado sob demanda: docx/jsPDF só precisam entrar no bundle quando o
      // usuário realmente gera um contrato, não no carregamento inicial da página.
      const { generateContractDocxBlob, downloadBlob, fetchLogoData } = await import("@/lib/contractDocs");
      const sections = buildContractSections(tpl.title, form, tpl.id);
      const logo = await fetchLogoData(logoUrl);
      const docxBlob = await generateContractDocxBlob(sections, logo);
      const contentText = buildContractText(tpl.title, form, tpl.id);
      const valueCents = parseValueToCents(form.value);
      const termDays = form.term ? parseInt(form.term.replace(/\D/g, ""), 10) || null : null;
      const slug = slugifyName(form.name);
      const result = await saveGeneratedContract({
        templateId: tpl.id,
        name: form.name.trim(),
        partyA: form.partyA,
        partyB: form.partyB,
        valueCents,
        termDays,
        sector: form.sector,
        docxBlob,
        contentText,
        preRiskScore: 18,
      });
      downloadBlob(docxBlob, `${slug}.docx`);
      setSavedRecord(result);
      setStep(4);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Tente novamente.";
      toast({
        title: "Erro ao salvar contrato",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      const { generateContractPdfBlob, downloadBlob, fetchLogoData } = await import("@/lib/contractDocs");
      const sections = buildContractSections(tpl.title, form, tpl.id);
      const logo = await fetchLogoData(logoUrl);
      const pdfBlob = generateContractPdfBlob(sections, logo);
      downloadBlob(pdfBlob, `${slugifyName(form.name || tpl.id)}.pdf`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : undefined;
      toast({ title: "Erro ao gerar PDF", description: msg, variant: "destructive" });
    }
  };

  const handleCopyText = async () => {
    const text = buildContractText(tpl.title, form, tpl.id);
    await navigator.clipboard.writeText(text);
    toast({ title: "Texto copiado!" });
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6 max-w-[1100px] mx-auto animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg md:text-2xl font-semibold tracking-tight">Gerar Contrato</h1>
          <p className="hidden md:block text-sm text-muted-foreground mt-1">
            Crie contratos equilibrados e juridicamente seguros com IA em minutos
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
        <TemplateStep selected={selected} onSelect={setSelected} onNext={() => setStep(2)} />
      )}

      {step === 2 && (
        <ContractFormStep
          form={form}
          setForm={setForm}
          errors={errors}
          setErrors={setErrors}
          tpl={tpl}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}

      {step === 3 && (
        <PreviewStep
          tpl={tpl}
          form={form}
          logoUrl={logoUrl}
          saving={saving}
          onBack={() => setStep(2)}
          onCopy={handleCopyText}
          onDownloadPdf={handleDownloadPdf}
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
