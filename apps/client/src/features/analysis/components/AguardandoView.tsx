import { Clock } from "lucide-react";
import { SojCard } from "@/components/layout/Primitives";
import { fmtBytes, fmtDate } from "@/lib/analysisFormat";
import type { FullContract } from "@/hooks/useContractAnalysis";

export function AguardandoView({ contract }: { contract: FullContract }) {
  return (
    <SojCard className="flex flex-col items-center gap-4 py-10 text-center">
      <div className="h-14 w-14 rounded-full bg-muted/40 flex items-center justify-center">
        <Clock className="h-7 w-7 text-muted-foreground" />
      </div>
      <div>
        <p className="font-medium">Aguardando processamento</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          O arquivo foi recebido e está na fila para extração de texto e análise jurídica.
        </p>
      </div>
      <div className="w-full max-w-xs mt-2 grid grid-cols-2 gap-2 text-xs text-left">
        {[
          ["Arquivo", contract.file_name ?? "—"],
          ["Tamanho", fmtBytes(contract.file_size)],
          ["Tipo", contract.file_type ?? "—"],
          ["Páginas", contract.page_count != null ? String(contract.page_count) : "—"],
          ["Enviado em", fmtDate(contract.created_at)],
          ["Partes", contract.party ?? "—"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg bg-muted/30 p-2.5">
            <p className="text-muted-foreground mb-0.5">{k}</p>
            <p className="font-medium truncate">{v}</p>
          </div>
        ))}
      </div>
    </SojCard>
  );
}
