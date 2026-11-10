import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard } from "lucide-react";

// Modulo de Pagamentos, Fase 3 -- wrapper mock do Card Payment Brick (spec
// peça 0/seção 7). Em PAYMENT_PROVIDER=mock não existe tokenização real:
// o "número do cartão" aqui só escolhe o cenário de teste pelos últimos 4
// dígitos (0000 aprova, 0001 recusa, 0002 fica em processamento — mesmas
// regras do MockProvider). NENHUM dado de cartão sai deste componente;
// onToken só recebe um cardToken sintético, nunca número/CVV completos
// (Princípio 0/1 da spec). Na Fase 6, troca por @mercadopago/sdk-react
// sem mudar quem consome (mesma prop onToken).

type CardBrickProps = {
  onToken: (cardToken: string) => void;
};

export function CardBrick({ onToken }: CardBrickProps) {
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");

  const digits = number.replace(/\D/g, "");
  const last4 = digits.slice(-4);

  const handleExpiryChange = (value: string) => {
    const clean = value.replace(/\D/g, "").slice(0, 4);
    setExpiry(clean.length > 2 ? `${clean.slice(0, 2)}/${clean.slice(2)}` : clean);
  };

  const handleNumberChange = (value: string) => {
    const clean = value.replace(/\D/g, "").slice(0, 16);
    setNumber(clean.replace(/(\d{4})(?=\d)/g, "$1 "));
    if (clean.length === 16) onToken(`mock_card_${clean.slice(-4)}`);
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <CreditCard className="h-3.5 w-3.5" />
        Ambiente de teste — nenhum dado de cartão sai do seu navegador.
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="card-number" className="text-xs">Número do cartão</Label>
        <Input
          id="card-number"
          placeholder="4000 0000 0000 0000"
          value={number}
          onChange={(e) => handleNumberChange(e.target.value)}
          className="font-mono"
        />
        <p className="text-[11px] text-muted-foreground">
          Final <span className="font-mono">0000</span> aprova · <span className="font-mono">0001</span> recusa · <span className="font-mono">0002</span> fica em processamento
        </p>
      </div>

      <div className="flex gap-2">
        <div className="flex flex-col gap-1.5 flex-1">
          <Label htmlFor="card-expiry" className="text-xs">Validade</Label>
          <Input id="card-expiry" placeholder="MM/AA" value={expiry} onChange={(e) => handleExpiryChange(e.target.value)} className="font-mono" />
        </div>
        <div className="flex flex-col gap-1.5 w-24">
          <Label htmlFor="card-cvv" className="text-xs">CVV</Label>
          <Input id="card-cvv" placeholder="123" value={cvv} onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))} className="font-mono" />
        </div>
      </div>

      {last4.length === 4 && digits.length < 16 && (
        <p className="text-[11px] text-muted-foreground">Continue digitando — faltam {16 - digits.length} dígitos.</p>
      )}
    </div>
  );
}
