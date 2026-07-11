import { SojCard } from "@/components/layout/Primitives";
import { Copy, Download, Loader2 } from "lucide-react";
import { buildContractText, type FormState } from "@/lib/generatorForm";
import type { Template } from "@/data/soj";

export function PreviewStep({
  tpl,
  form,
  logoUrl,
  saving,
  onBack,
  onCopy,
  onDownloadPdf,
  onGenerate,
}: {
  tpl: Template;
  form: FormState;
  logoUrl: string | null;
  saving: boolean;
  onBack: () => void;
  onCopy: () => void;
  onDownloadPdf: () => void;
  onGenerate: () => void;
}) {
  return (
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
          onClick={onBack}
          disabled={saving}
          className="flex-1 md:flex-none h-11 md:h-10 px-5 rounded-lg border border-border text-sm hover:bg-muted/40 active:opacity-70 transition-colors disabled:opacity-50"
        >
          ← Editar
        </button>
        <button
          disabled={saving}
          onClick={onCopy}
          className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 h-11 md:h-10 px-5 rounded-lg border border-border text-sm hover:bg-muted/40 active:opacity-70 transition-colors disabled:opacity-50"
        >
          <Copy className="h-3.5 w-3.5" /> Copiar
        </button>
        <button
          disabled={saving}
          onClick={onDownloadPdf}
          className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 h-11 md:h-10 px-5 rounded-lg border border-border text-sm hover:bg-muted/40 active:opacity-70 transition-colors disabled:opacity-50"
        >
          <Download className="h-3.5 w-3.5" /> PDF
        </button>
        <button
          disabled={saving}
          onClick={onGenerate}
          className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 h-11 md:h-10 px-5 md:px-6 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:opacity-80 transition-opacity disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          {saving ? "Salvando..." : "Baixar DOCX"}
        </button>
      </div>
    </div>
  );
}
