import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type DowngradeReasonModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fromPlanName: string;
  toPlanName: string;
  submitting: boolean;
  onConfirm: (reason: string) => void;
};

export function DowngradeReasonModal({ open, onOpenChange, fromPlanName, toPlanName, submitting, onConfirm }: DowngradeReasonModalProps) {
  const [reason, setReason] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Trocar para o plano {toPlanName}</DialogTitle>
          <DialogDescription>
            Você vai sair do plano {fromPlanName} para o {toPlanName}. Isso só passa a valer na próxima renovação — até lá, seu plano atual continua ativo normalmente.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="downgrade-reason" className="text-xs text-muted-foreground">
            Por que você está fazendo essa troca? (opcional, mas ajuda muito a gente a melhorar)
          </label>
          <Textarea
            id="downgrade-reason"
            placeholder="Ex.: preciso de menos análises por mês, o preço não cabe agora, encontrei outra solução…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={() => onConfirm(reason)} disabled={submitting}>
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Confirmar troca
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
