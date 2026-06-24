import { useMemo, useState } from "react";
import { z } from "zod";
import { TEMPLATES } from "@/data/soj";
import { SojCard } from "@/components/layout/Primitives";
import { Check, Download, Send, Plus, X, Copy, History, Loader2 } from "lucide-react";
import { HistoryTab } from "@/components/generator/HistoryTab";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  saveGeneratedContract,
  getSignedUrl,
} from "@/hooks/useGeneratedContracts";
import {
  buildContractSections,
  generateContractDocxBlob,
  generateContractPdfBlob,
  downloadBlob,
  fetchLogoData,
} from "@/lib/contractDocs";
import { useOrganization } from "@/hooks/useOrganization";
import { formatDocument, validateDocument } from "@/lib/brazilianDocs";

const STEPS = ["Tipo de Contrato", "Informações", "Revisar", "Concluído"];

type FormState = {
  name: string;
  partyA: string;
  cnpjA: string;
  cityA: string;
  partyB: string;
  cnpjB: string;
  cityB: string;
  value: string;
  term: string;
  sector: string;
  foro: string;
  notes: string;
};
const EMPTY: FormState = {
  name: "", partyA: "", cnpjA: "", cityA: "",
  partyB: "", cnpjB: "", cityB: "",
  value: "", term: "", sector: "", foro: "", notes: "",
};

// Validação de fronteira do wizard (CLAUDE.md: "Zod em todas as fronteiras").
// CNPJ/CPF são opcionais no formulário, mas quando preenchidos precisam ter dígito verificador válido.
const contractFormSchema = z.object({
  name: z.string().trim().min(1, "Nome do contrato é obrigatório").max(120, "Máximo de 120 caracteres"),
  partyA: z.string().max(200, "Máximo de 200 caracteres").optional(),
  cnpjA: z.string().optional().refine((v) => !v || validateDocument(v).valid, { message: "CNPJ/CPF inválido" }),
  cityA: z.string().max(120, "Máximo de 120 caracteres").optional(),
  partyB: z.string().max(200, "Máximo de 200 caracteres").optional(),
  cnpjB: z.string().optional().refine((v) => !v || validateDocument(v).valid, { message: "CNPJ/CPF inválido" }),
  cityB: z.string().max(120, "Máximo de 120 caracteres").optional(),
  value: z.string().max(30, "Valor muito longo").optional(),
  term: z.string().max(120, "Máximo de 120 caracteres").optional(),
  sector: z.string().max(120, "Máximo de 120 caracteres").optional(),
  foro: z.string().max(120, "Máximo de 120 caracteres").optional(),
  notes: z.string().max(2000, "Máximo de 2000 caracteres").optional(),
});

type FormErrors = Partial<Record<keyof FormState, string>>;

function validateForm(form: FormState): FormErrors {
  const result = contractFormSchema.safeParse(form);
  if (result.success) return {};
  const errors: FormErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof FormState;
    if (!errors[field]) errors[field] = issue.message;
  }
  return errors;
}

const inputCls =
  "w-full rounded-[10px] border bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.1)] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[rgba(0,229,160,0.6)] transition-colors text-base md:text-sm";

function slugifyName(name: string): string {
  return (name || "contrato")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "contrato";
}

function buildContractText(tplTitle: string, form: FormState, tplId?: string) {
  const sections = buildContractSections(tplTitle, form, tplId);
  return [
    sections.title,
    "",
    sections.parties.contratante,
    sections.parties.contratado,
    "",
    ...sections.clauses.flatMap((c) => [`${c.heading}`, c.body, ""]),
    ...sections.footer,
  ].join("\n");
}

function parseValueToCents(raw: string): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
  const n = parseFloat(cleaned);
  if (isNaN(n)) return null;
  return Math.round(n * 100);
}

export default function Generator() {
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [savedRecord, setSavedRecord] = useState<{
    id: string;
    filePath: string;
    signedUrl: string | null;
  } | null>(null);
  const [signOpen, setSignOpen] = useState(false);
  const [signers, setSigners] = useState<string[]>([""]);
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
    setForm(EMPTY);
    setSavedRecord(null);
    setSigners([""]);
    setErrors({});
  };

  const handleDocChange = (field: "cnpjA" | "cnpjB", raw: string) => {
    const formatted = formatDocument(raw);
    setForm((prev) => ({ ...prev, [field]: formatted }));
    const fieldResult = contractFormSchema.shape[field].safeParse(formatted);
    setErrors((prev) => ({ ...prev, [field]: fieldResult.success ? undefined : fieldResult.error.issues[0]?.message }));
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
      const sections = buildContractSections(tpl.title, form, tpl.id);
      const logo = await fetchLogoData(logoUrl);
      const pdfBlob = generateContractPdfBlob(sections, logo);
      downloadBlob(pdfBlob, `${slugifyName(form.name || tpl.id)}.pdf`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : undefined;
      toast({ title: "Erro ao gerar PDF", description: msg, variant: "destructive" });
    }
  };

  const handleDownload = async (filePath?: string | null, fallbackUrl?: string | null) => {
    let url = fallbackUrl ?? null;
    if (filePath && !url) {
      url = await getSignedUrl(filePath);
    }
    if (!url) {
      toast({ title: "Link indisponível", variant: "destructive" });
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleCopyLink = async () => {
    if (!savedRecord?.signedUrl) {
      toast({ title: "Link indisponível", variant: "destructive" });
      return;
    }
    await navigator.clipboard.writeText(savedRecord.signedUrl);
    toast({ title: "Link copiado!" });
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
        <SojCard className="flex flex-col gap-4">
          <h3 className="font-medium text-sm md:text-base">Selecione o tipo de contrato</h3>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 md:gap-3">
            {TEMPLATES.map((t, i) => {
              const active = selected === t.id;
              const isLastOdd = TEMPLATES.length % 2 === 1 && i === TEMPLATES.length - 1;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelected(t.id)}
                  className={cn(
                    "text-left rounded-xl border transition-all active:opacity-80 p-4 md:p-5",
                    isLastOdd && "col-span-2 lg:col-span-1",
                  )}
                  style={
                    active
                      ? { borderColor: "rgba(0,229,160,0.35)", background: "rgba(0,229,160,0.08)" }
                      : { borderColor: "hsl(var(--border))", background: "hsl(var(--card))" }
                  }
                >
                  <div className="text-[22px] md:text-2xl mb-2">{t.icon}</div>
                  <p className="font-medium text-[13px] md:text-sm mb-1">{t.title}</p>
                  <p className="text-[11px] md:text-xs text-muted-foreground leading-relaxed">{t.desc}</p>
                  {active && <p className="text-[11px] md:text-xs text-primary font-medium mt-2">✓ Selecionado</p>}
                </button>
              );
            })}
          </div>
          <button
            disabled={!selected}
            onClick={() => selected && setStep(2)}
            className={cn(
              "self-stretch md:self-start h-11 md:h-10 px-6 rounded-lg text-sm font-medium transition-all active:opacity-80",
              selected
                ? "bg-primary text-primary-foreground hover:opacity-90"
                : "bg-muted text-muted-foreground cursor-not-allowed",
            )}
          >
            Continuar →
          </button>
        </SojCard>
      )}

      {step === 2 && (
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
                onChange={(e) => setForm({ ...form, name: e.target.value })}
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
                    onChange={(e) => setForm({ ...form, partyA: e.target.value })}
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
                    onChange={(e) => setForm({ ...form, cityA: e.target.value })}
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
                    onChange={(e) => setForm({ ...form, cityB: e.target.value })}
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
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                  placeholder="Ex: 120.000,00"
                  className={inputCls}
                  style={{ padding: "11px 12px", minHeight: 44 }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] md:text-xs text-muted-foreground">Prazo de Vigência</label>
                <input
                  value={form.term}
                  onChange={(e) => setForm({ ...form, term: e.target.value })}
                  placeholder="Ex: 12 meses, 1 ano, indeterminado..."
                  className={inputCls}
                  style={{ padding: "11px 12px", minHeight: 44 }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] md:text-xs text-muted-foreground">Setor de Atuação</label>
                <input
                  value={form.sector}
                  onChange={(e) => setForm({ ...form, sector: e.target.value })}
                  placeholder="Ex: Tecnologia, Saúde, Varejo..."
                  className={inputCls}
                  style={{ padding: "11px 12px", minHeight: 44 }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] md:text-xs text-muted-foreground">Foro (cidade para disputas)</label>
                <input
                  value={form.foro}
                  onChange={(e) => setForm({ ...form, foro: e.target.value })}
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
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Cláusulas específicas, requisitos especiais..."
                className={inputCls}
                rows={3}
                style={{ padding: "11px 12px" }}
              />
            </div>
          </div>
          <div className="flex justify-between gap-2 pt-2">
            <button
              onClick={() => setStep(1)}
              className="h-11 md:h-10 px-5 rounded-lg border border-border text-sm hover:bg-muted/40 active:opacity-70 transition-colors"
            >
              ← Voltar
            </button>
            <button
              disabled={!form.name.trim() || !!errors.cnpjA || !!errors.cnpjB}
              onClick={() => {
                const validationErrors = validateForm(form);
                setErrors(validationErrors);
                if (Object.keys(validationErrors).length === 0) setStep(3);
              }}
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
      )}

      {step === 3 && (
        <div className="flex flex-col gap-4">
          <SojCard>
            <div className="flex items-start gap-3 mb-4">
              <div className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-muted/60 text-muted-foreground flex items-center justify-center font-bold shrink-0 text-sm">
                3
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm md:text-base">Pré-visualização do contrato</p>
                <p className="text-[11px] md:text-xs text-muted-foreground">Revise o conteúdo antes de baixar</p>
              </div>
            </div>
            <div
              className="rounded-lg bg-muted/40 border border-border p-4 md:p-5 space-y-3 text-foreground/90 overflow-y-auto whitespace-pre-wrap"
              style={{ fontFamily: "Georgia, serif", fontSize: 12, lineHeight: 1.7, maxHeight: 360 }}
            >
              {logoUrl && (
                <div className="flex justify-center pb-3 mb-2 border-b border-border/60">
                  <img src={logoUrl} alt="Logo" className="max-h-16 object-contain" />
                </div>
              )}
              {buildContractText(tpl.title, form, tpl.id)}
            </div>
          </SojCard>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStep(2)}
              disabled={saving}
              className="flex-1 md:flex-none h-11 md:h-10 px-5 rounded-lg border border-border text-sm hover:bg-muted/40 active:opacity-70 transition-colors disabled:opacity-50"
            >
              ← Editar
            </button>
            <button
              disabled={saving}
              onClick={async () => {
                const text = buildContractText(tpl.title, form, tpl.id);
                await navigator.clipboard.writeText(text);
                toast({ title: "Texto copiado!" });
              }}
              className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 h-11 md:h-10 px-5 rounded-lg border border-border text-sm hover:bg-muted/40 active:opacity-70 transition-colors disabled:opacity-50"
            >
              <Copy className="h-3.5 w-3.5" /> Copiar
            </button>
            <button
              disabled={saving}
              onClick={handleDownloadPdf}
              className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 h-11 md:h-10 px-5 rounded-lg border border-border text-sm hover:bg-muted/40 active:opacity-70 transition-colors disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" /> PDF
            </button>
            <button
              disabled={saving}
              onClick={handleGenerate}
              className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 h-11 md:h-10 px-5 md:px-6 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:opacity-80 transition-opacity disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              {saving ? "Salvando..." : "Baixar DOCX"}
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <SojCard className="flex flex-col items-center text-center py-10 md:py-12">
          <div className="h-14 w-14 md:h-16 md:w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mb-4">
            ✓
          </div>
          <h2 className="text-base md:text-xl font-semibold">Contrato gerado com sucesso!</h2>
          <p className="text-[13px] md:text-sm text-muted-foreground mt-2 max-w-md">
            O DOCX foi baixado e salvo no seu portfólio. Você pode enviá-lo para assinatura agora.
          </p>
          <p className="text-[11px] md:text-xs text-muted-foreground mt-4">
            Sugestão: Clicksign, DocuSign ou D4Sign para assinatura eletrônica com validade jurídica
          </p>
          <div className="flex flex-col md:flex-row gap-2 mt-6 w-full md:w-auto">
            <button
              onClick={reset}
              className="h-11 md:h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:opacity-80 transition-opacity"
            >
              Gerar Outro Contrato
            </button>
            <button
              onClick={() => setSignOpen(true)}
              className="inline-flex items-center justify-center gap-2 h-11 md:h-10 px-5 rounded-lg border border-border text-sm hover:bg-muted/40 active:opacity-70 transition-colors"
            >
              <Send className="h-3.5 w-3.5" /> Enviar para Assinatura
            </button>
          </div>
        </SojCard>
      )}

      </>)}

      <Dialog open={signOpen} onOpenChange={setSignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar para Assinatura</DialogTitle>
            <DialogDescription>
              Baixe o contrato e envie para os signatários pela plataforma de sua preferência:
              Clicksign, DocuSign, D4Sign ou outra.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label className="text-xs text-muted-foreground">E-mails dos signatários</Label>
              {signers.map((email, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      const next = [...signers];
                      next[idx] = e.target.value;
                      setSigners(next);
                    }}
                    placeholder="signatario@empresa.com"
                  />
                  {signers.length > 1 && (
                    <button
                      onClick={() => setSigners(signers.filter((_, i) => i !== idx))}
                      className="h-10 w-10 shrink-0 rounded-md border border-border flex items-center justify-center hover:bg-muted/40 active:opacity-70 transition-colors"
                      aria-label="Remover signatário"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => setSigners([...signers, ""])}
                className="self-start inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:opacity-80 active:opacity-70 transition-opacity mt-1"
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar signatário
              </button>
            </div>

            <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3">
              <Label className="text-xs text-muted-foreground">Link de download</Label>
              <div className="text-[11px] break-all text-foreground/80 font-mono">
                {savedRecord?.signedUrl ?? "Link não disponível"}
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleCopyLink}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md border border-border text-xs font-medium hover:bg-muted/40 active:opacity-70 transition-colors"
                >
                  <Copy className="h-3.5 w-3.5" /> Copiar link
                </button>
                <button
                  onClick={() => handleDownload(savedRecord?.filePath, savedRecord?.signedUrl)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 active:opacity-80 transition-opacity"
                >
                  <Download className="h-3.5 w-3.5" /> Baixar contrato
                </button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <button
              onClick={() => setSignOpen(false)}
              className="h-10 px-5 rounded-lg border border-border text-sm hover:bg-muted/40 active:opacity-70 transition-colors"
            >
              Fechar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

