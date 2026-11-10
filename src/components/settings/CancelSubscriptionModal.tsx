import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

// Modulo de Pagamentos, Fase 4a -- cancelamento self-service (spec Peça 7).
// Um passo só (abrir + confirmar = no máximo 2 cliques, Decreto 11.034/2022).

const REASON_CATEGORIES = [
  { value: "preco", label: "O preço não cabe no momento" },
  { value: "nao_usei", label: "Não usei o suficiente" },
  { value: "outra_solucao", label: "Encontrei outra solução" },
  { value: "recursos_faltando", label: "Falta algum recurso que eu precisava" },
  { value: "outro", label: "Outro motivo" },
] as const;

type CancelSubscriptionModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accessUntilLabel: string | null;
  isRegretEligible: boolean;
  submitting: boolean;
  onConfirm: (reasonCategory: string, reasonText: string) => void;
};

export function CancelSubscriptionModal({ open, onOpenChange, accessUntilLabel, isRegretEligible, submitting, onConfirm }: CancelSubscriptionModalProps) {
  const [category, setCategory] = useState<string>(REASON_CATEGORIES[0].value);
  const [text, setText] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar assinatura</DialogTitle>
          <DialogDescription>
            {isRegretEligible
              ? "Como você cancelou dentro de 7 dias da sua primeira contratação, tem direito a reembolso total (CDC art. 49) — o estorno é feito automaticamente."
              : accessUntilLabel
                ? `Você continua com acesso normal até ${accessUntilLabel}. Depois disso, sua conta deixa de ser cobrada e o plano não é mais renovado. Seus dados não são apagados.`
                : "Sua conta deixa de ser cobrada e o plano não é mais renovado. Seus dados não são apagados."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <RadioGroup value={category} onValueChange={setCategory} className="flex flex-col gap-2">
            {REASON_CATEGORIES.map((r) => (
              <label key={r.value} className="flex items-center gap-2 text-sm">
                <RadioGroupItem value={r.value} /> {r.label}
              </label>
            ))}
          </RadioGroup>

          <Textarea
            placeholder="Quer contar mais alguma coisa? (opcional)"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Voltar
          </Button>
          <Button variant="destructive" onClick={() => onConfirm(category, text)} disabled={submitting}>
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Confirmar cancelamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
