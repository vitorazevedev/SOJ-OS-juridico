import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getSignedUrl } from "@/hooks/useGeneratedContracts";

export function SendForSignatureDialog({
  open,
  onClose,
  savedRecord,
}: {
  open: boolean;
  onClose: () => void;
  savedRecord: { id: string; filePath: string; signedUrl: string | null } | null;
}) {
  const { toast } = useToast();

  const handleDownload = async () => {
    let url = savedRecord?.signedUrl ?? null;
    if (savedRecord?.filePath && !url) {
      url = await getSignedUrl(savedRecord.filePath);
    }
    if (!url) {
      toast({ title: "Link indisponível", variant: "destructive" });
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Enviar para Assinatura
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground px-2 py-0.5 border border-dashed border-border rounded-full">
              Em breve
            </span>
          </DialogTitle>
          <DialogDescription>
            Envio integrado para assinatura eletrônica ainda não está disponível. Por enquanto,
            baixe o contrato e envie manualmente pela plataforma de sua preferência: Clicksign,
            DocuSign, D4Sign ou outra.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3">
            <Label className="text-xs text-muted-foreground">Contrato gerado</Label>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleDownload}
                className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 active:opacity-80 transition-opacity"
              >
                <Download className="h-3.5 w-3.5" /> Baixar contrato
              </button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <button
            onClick={onClose}
            className="h-10 px-5 rounded-lg border border-border text-sm hover:bg-muted/40 active:opacity-70 transition-colors"
          >
            Fechar
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
