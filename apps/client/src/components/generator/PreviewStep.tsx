import { useState } from "react";
import { SojCard } from "@/components/layout/Primitives";
import { Checkbox } from "@/components/ui/checkbox";
import { Copy, Download, Loader2 } from "lucide-react";
import { DocxPreview } from "@/components/generator/DocxPreview";
import type { ContractTemplate } from "@/data/contractTemplatesCatalog";

const SCOPE_WARNING =
  "Confirmo que esta é uma operação empresarial privada sob direito brasileiro, e não se enquadra em relações de consumo, trabalho, administração pública, imóveis com forma especial, valores mobiliários, instituições financeiras reguladas ou setores sujeitos a autorização específica — casos que exigem revisão jurídica adicional antes do uso deste modelo.";

export function PreviewStep({
  tpl,
  docxBlob,
  previewError,
  saving,
  scopeConfirmed,
  setScopeConfirmed,
  onBack,
  onCopy,
  onGenerate,
}: {
  tpl: ContractTemplate;
  docxBlob: Blob | null;
  previewError: string | null;
  saving: boolean;
  scopeConfirmed: boolean;
  setScopeConfirmed: (v: boolean) => void;
  onBack: () => void;
  onCopy: () => void;
  onGenerate: () => void;
}) {
  const [copying, setCopying] = useState(false);

  const handleCopy = async () => {
    setCopying(true);
    try { await onCopy(); } finally { setCopying(false); }
  };

  return (
    <div className="flex flex-col gap-4">
      <SojCard>
        <div className="flex items-start gap-3 mb-4">
          <div className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-muted/60 text-muted-foreground flex items-center justify-center font-bold shrink-0 text-sm">
            3
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm md:text-base">Pré-visualização do contrato</p>
            <p className="text-[11px] md:text-xs text-muted-foreground">{tpl.titulo} — revise o conteúdo antes de baixar</p>
          </div>
        </div>
        {previewError ? (
          <p className="text-sm text-destructive text-center py-10">{previewError}</p>
        ) : (
          <DocxPreview blob={docxBlob} />
        )}
      </SojCard>

      <SojCard className="flex items-start gap-3">
        <Checkbox
          id="scope-confirm"
          checked={scopeConfirmed}
          onCheckedChange={(v) => setScopeConfirmed(v === true)}
          className="mt-0.5 shrink-0"
        />
        <label htmlFor="scope-confirm" className="text-[11px] md:text-xs text-muted-foreground leading-relaxed cursor-pointer">
          {SCOPE_WARNING}
        </label>
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
          disabled={saving || copying || !docxBlob}
          onClick={handleCopy}
          className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 h-11 md:h-10 px-5 rounded-lg border border-border text-sm hover:bg-muted/40 active:opacity-70 transition-colors disabled:opacity-50"
        >
          {copying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />} Copiar texto
        </button>
        <button
          disabled={saving || !scopeConfirmed || !docxBlob}
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
