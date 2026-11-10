import { useState } from "react";
import { SojCard } from "@/components/layout/Primitives";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { getEdgeFunctionErrorMessage } from "@/lib/edgeFunctionError";

// Modulo de Pagamentos, Fase 2 -- disparo manual de eventos simulados do
// gateway (spec secao 11), contra billing-dev-simulator (que só roda com
// PAYMENT_PROVIDER=mock). Ferramenta interna, sem polimento extra.

type SimAction = "payment_outcome" | "subscription_outcome" | "chargeback" | "issue_invoice" | "resend";

export function BillingDevSimulator() {
  const [action, setAction] = useState<SimAction>("payment_outcome");
  const [organizationId, setOrganizationId] = useState("");
  const [subscriptionId, setSubscriptionId] = useState("");
  const [providerPaymentId, setProviderPaymentId] = useState("");
  const [status, setStatus] = useState("approved");
  const [webhookEventId, setWebhookEventId] = useState("");
  const [chargebackReason, setChargebackReason] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setResult(null);
    try {
      const body: Record<string, unknown> = { action };
      if (action === "payment_outcome") {
        body.status = status;
        if (organizationId) body.organizationId = organizationId;
        if (subscriptionId) body.subscriptionId = subscriptionId;
        if (providerPaymentId) body.providerPaymentId = providerPaymentId;
      } else if (action === "subscription_outcome") {
        body.status = status;
        body.subscriptionId = subscriptionId;
      } else if (action === "chargeback") {
        body.providerPaymentId = providerPaymentId;
        if (chargebackReason) body.reason = chargebackReason;
      } else if (action === "issue_invoice") {
        body.paymentId = paymentId;
      } else if (action === "resend") {
        body.webhookEventId = webhookEventId;
      }

      const { data, error } = await supabase.functions.invoke("billing-dev-simulator", { body });
      if (error) {
        const message = await getEdgeFunctionErrorMessage(error, "Erro ao disparar evento simulado");
        toast.error(message);
        setResult(JSON.stringify({ error: message }, null, 2));
        return;
      }
      setResult(JSON.stringify(data, null, 2));
      toast.success("Evento simulado disparado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SojCard className="flex flex-col gap-3 p-5">
      <div>
        <p className="text-sm font-medium">Simulador de pagamentos (mock)</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Dispara eventos de webhook simulados contra o processador real — só funciona com PAYMENT_PROVIDER=mock.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["payment_outcome", "subscription_outcome", "chargeback", "issue_invoice", "resend"] as SimAction[]).map((a) => (
          <button
            key={a}
            onClick={() => setAction(a)}
            className={`text-xs font-mono px-3 py-1.5 rounded-lg border transition-colors ${
              action === a ? "border-primary text-primary bg-primary-dim" : "border-border text-muted-foreground hover:bg-muted/40"
            }`}
          >
            {a}
          </button>
        ))}
      </div>

      {action === "payment_outcome" && (
        <div className="flex flex-col md:flex-row gap-2">
          <Input placeholder="organizationId (pagamento novo)" value={organizationId} onChange={(e) => setOrganizationId(e.target.value)} />
          <Input placeholder="subscriptionId (renovação, opcional)" value={subscriptionId} onChange={(e) => setSubscriptionId(e.target.value)} />
          <Input placeholder="providerPaymentId (reenviar/fora de ordem, opcional)" value={providerPaymentId} onChange={(e) => setProviderPaymentId(e.target.value)} />
          <Input placeholder="status (approved|rejected|in_process|pending)" value={status} onChange={(e) => setStatus(e.target.value)} />
        </div>
      )}

      {action === "subscription_outcome" && (
        <div className="flex flex-col md:flex-row gap-2">
          <Input placeholder="subscriptionId" value={subscriptionId} onChange={(e) => setSubscriptionId(e.target.value)} />
          <Input placeholder="status (cancelled|paused)" value={status} onChange={(e) => setStatus(e.target.value)} />
        </div>
      )}

      {action === "chargeback" && (
        <div className="flex flex-col md:flex-row gap-2">
          <Input placeholder="providerPaymentId (pagamento já aprovado)" value={providerPaymentId} onChange={(e) => setProviderPaymentId(e.target.value)} />
          <Input placeholder="motivo (opcional)" value={chargebackReason} onChange={(e) => setChargebackReason(e.target.value)} />
        </div>
      )}

      {action === "issue_invoice" && (
        <Input placeholder="paymentId (pagamento approved)" value={paymentId} onChange={(e) => setPaymentId(e.target.value)} />
      )}

      {action === "resend" && (
        <Input placeholder="webhookEventId" value={webhookEventId} onChange={(e) => setWebhookEventId(e.target.value)} />
      )}

      <div>
        <Button size="sm" onClick={run} disabled={loading}>
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Disparar
        </Button>
      </div>

      {result && (
        <pre className="text-[11px] font-mono rounded-lg border border-border p-3 overflow-x-auto whitespace-pre-wrap">{result}</pre>
      )}
    </SojCard>
  );
}
