import { useNavigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { QuotaExceededInfo } from "@/hooks/useContracts";

function renewalLabel(info: QuotaExceededInfo): string | null {
  if (info.kind === "suspended") return null;
  if (info.kind === "freemium") {
    const now = new Date();
    const firstOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return `Seu limite renova em ${firstOfNextMonth.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}`;
  }
  if (info.renewsAt) {
    return `Seu limite renova em ${new Date(info.renewsAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}`;
  }
  return null;
}

export function UpgradeLimitModal({ info, onClose }: { info: QuotaExceededInfo; onClose: () => void }) {
  const navigate = useNavigate();
  const renewal = renewalLabel(info);

  const title = info.kind === "suspended"
    ? "Sua assinatura está suspensa"
    : "Você atingiu o limite de análises do seu plano";

  const description = info.kind === "suspended"
    ? "Sua assinatura foi suspensa por falta de pagamento. Renove para voltar a analisar contratos normalmente."
    : info.kind === "freemium"
      ? `O plano gratuito permite ${info.limit} análise por mês. Para continuar analisando agora, faça upgrade para um plano pago.`
      : `Seu plano permite até ${info.limit} contrato${info.limit === 1 ? "" : "s"} analisado${info.limit === 1 ? "" : "s"} por mês. Para continuar analisando agora, faça upgrade para um plano com limite maior.`;

  const ctaLabel = info.kind === "suspended" ? "Renovar assinatura" : "Fazer upgrade agora";

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="h-10 w-10 rounded-full bg-risk-critical-dim flex items-center justify-center mb-2">
            <AlertTriangle className="h-5 w-5 text-risk-critical" />
          </div>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {renewal && <p className="text-xs text-muted-foreground">{renewal}</p>}

        <DialogFooter>
          <button onClick={onClose} className="h-10 px-5 rounded-lg border border-border text-sm hover:bg-muted/40">
            Agora não
          </button>
          <button
            onClick={() => navigate("/settings?tab=plan")}
            className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
          >
            {ctaLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
