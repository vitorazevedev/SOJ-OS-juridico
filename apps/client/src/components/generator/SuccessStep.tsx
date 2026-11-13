import { SojCard } from "@/components/layout/Primitives";
import { Send } from "lucide-react";

export function SuccessStep({
  onReset,
  onSignClick,
}: {
  onReset: () => void;
  onSignClick: () => void;
}) {
  return (
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
          onClick={onReset}
          className="h-11 md:h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:opacity-80 transition-opacity"
        >
          Gerar Outro Contrato
        </button>
        <button
          onClick={onSignClick}
          className="inline-flex items-center justify-center gap-2 h-11 md:h-10 px-5 rounded-lg border border-border text-sm hover:bg-muted/40 active:opacity-70 transition-colors"
        >
          <Send className="h-3.5 w-3.5" /> Enviar para Assinatura
        </button>
      </div>
    </SojCard>
  );
}
