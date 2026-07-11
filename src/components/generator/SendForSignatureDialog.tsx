import { useState } from "react";
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
import { Copy, Download, Plus, X } from "lucide-react";
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
  const [signers, setSigners] = useState<string[]>([""]);

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

  const handleCopyLink = async () => {
    if (!savedRecord?.signedUrl) {
      toast({ title: "Link indisponível", variant: "destructive" });
      return;
    }
    await navigator.clipboard.writeText(savedRecord.signedUrl);
    toast({ title: "Link copiado!" });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
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
