import { useEffect, useMemo, useRef } from "react";
import { initMercadoPago, CardPayment } from "@mercadopago/sdk-react";
import { env } from "@/config/env";

// Modulo de Pagamentos, Fase 6 -- Card Payment Brick real do Mercado Pago
// (spec peça 0/seção 7). O Brick tokeniza o cartão dentro de um iframe do
// próprio MP; nenhum número, CVV ou validade completa passa pelo nosso
// código ou pelo nosso backend (Princípio 0/1 da spec) -- só recebemos
// `formData.token`, de uso único. maxInstallments=1 porque assinatura
// recorrente (preapproval) não usa parcelamento. Mesma prop onToken de
// antes (versão mock) -- quem consome (Checkout.tsx, UpdateCardModal.tsx)
// não precisou mudar nada além de passar o novo prop "amount".

let mpInitialized = false;

type CardBrickProps = {
  onToken: (cardToken: string) => void;
  amount: number; // em reais (unidade real, não centavos -- é o que o Brick espera)
  payerEmail?: string; // pré-preenche o campo de e-mail do próprio Brick, evitando pedir de novo
};

export function CardBrick({ onToken, amount, payerEmail }: CardBrickProps) {
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    if (mpInitialized || !env.mpPublicKey) return;
    initMercadoPago(env.mpPublicKey, { locale: "pt-BR" });
    mpInitialized = true;
  }, []);

  // O wrapper React do Brick reinicializa o iframe interno sempre que a
  // prop "initialization"/"customization" muda de REFERÊNCIA -- um objeto
  // literal novo a cada render (mesmo com os mesmos valores) derruba o
  // Brick no meio da digitação do usuário. Memoiza pra só mudar quando o
  // valor de verdade muda.
  const initialization = useMemo(
    () => ({ amount, payer: payerEmail ? { email: payerEmail } : undefined }),
    [amount, payerEmail]
  );
  const customization = useMemo(() => ({ paymentMethods: { maxInstallments: 1 } }), []);

  if (!env.mpPublicKey) {
    return (
      <p className="text-xs text-destructive rounded-lg border border-destructive/30 p-3">
        VITE_MP_PUBLIC_KEY não configurado -- o formulário de cartão não pode carregar.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-border p-2">
      <CardPayment
        initialization={initialization}
        customization={customization}
        onSubmit={(formData) => {
          const token = (formData as { token?: string } | undefined)?.token;
          if (token) onTokenRef.current(token);
          // Nunca enviamos isto pra nenhum endpoint -- o Brick ja fez a
          // cobranca/tokenizacao sozinho. Devolver uma Promise resolvida
          // so evita o Brick mostrar um erro de envio que nao existe.
          return Promise.resolve();
        }}
        onError={(error) => {
          console.error("CardBrick: erro no Payment Brick do Mercado Pago:", error);
        }}
      />
    </div>
  );
}
