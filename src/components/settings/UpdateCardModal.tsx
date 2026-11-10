import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, QrCode } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { CardBrick } from "@/components/billing/CardBrick";
import { getEdgeFunctionErrorMessage } from "@/lib/edgeFunctionError";
import { useOrganization } from "@/hooks/useOrganization";

// Modulo de Pagamentos, Fase 4b -- sair do past_due (spec Peça 6): atualizar
// cartão ou pagar a fatura atual com Pix na hora.

type UpdateCardModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
};

export function UpdateCardModal({ open, onOpenChange, onUpdated }: UpdateCardModalProps) {
  const navigate = useNavigate();
  const { org } = useOrganization();
  const [cardToken, setCardToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [amountReais, setAmountReais] = useState<number | null>(null);

  // O Brick real precisa saber o valor pra mostrar (nao e usado pra
  // cobrar aqui -- essa chamada so troca o cartao, a nova tentativa de
  // cobranca chega depois via webhook).
  useEffect(() => {
    if (!open || !org?.id) return;
    supabase
      .from("subscriptions")
      .select("billing_plans!plan_id(price_cents)")
      .eq("organization_id", org.id)
      .eq("status", "past_due")
      .maybeSingle()
      .then(({ data }) => {
        const priceCents = (data?.billing_plans as { price_cents: number } | null)?.price_cents;
        setAmountReais(priceCents ? priceCents / 100 : null);
      });
  }, [open, org?.id]);

  const retry = async (method: "card" | "pix") => {
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("billing-retry-payment", {
        body: { method, cardToken: method === "card" ? cardToken : undefined },
      });
      if (error || data?.error) {
        const message = data?.error ?? (error ? await getEdgeFunctionErrorMessage(error, "Erro ao atualizar pagamento.") : "Erro ao atualizar pagamento.");
        toast.error(message);
        return;
      }
      if (method === "pix") {
        navigate(`/checkout/pix/${data.payment_id}`);
        return;
      }
      toast.success("Cartão atualizado — estamos tentando cobrar novamente.");
      onOpenChange(false);
      onUpdated();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Atualizar forma de pagamento</DialogTitle>
          <DialogDescription>
            Atualize seu cartão para tentarmos cobrar novamente, ou pague a fatura atual agora com Pix.
          </DialogDescription>
        </DialogHeader>

        {amountReais != null && <CardBrick onToken={setCardToken} amount={amountReais} />}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => retry("pix")} disabled={submitting} className="w-full sm:w-auto">
            <QrCode className="h-3.5 w-3.5" /> Pagar com Pix agora
          </Button>
          <Button onClick={() => retry("card")} disabled={submitting || !cardToken} className="w-full sm:w-auto">
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Atualizar cartão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
