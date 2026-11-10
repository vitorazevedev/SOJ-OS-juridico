import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { SojCard } from "@/components/layout/Primitives";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

type PaymentStatus = "pending" | "approved" | "rejected" | "cancelled" | "expired" | "refunded" | "partially_refunded" | "in_mediation" | "charged_back";
type Payment = {
  id: string;
  status: PaymentStatus;
  amount_cents: number;
  pix_qr_code: string | null;
  pix_qr_code_base64: string | null;
  pix_expires_at: string | null;
};

export default function PixPayment() {
  const { paymentId } = useParams<{ paymentId: string }>();
  const navigate = useNavigate();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!paymentId) return;
    supabase
      .from("payments")
      .select("id, status, amount_cents, pix_qr_code, pix_qr_code_base64, pix_expires_at")
      .eq("id", paymentId)
      .maybeSingle()
      .then(({ data }) => {
        setPayment(data as Payment | null);
        setLoading(false);
      });
  }, [paymentId]);

  useEffect(() => {
    if (!paymentId) return;
    const channel = supabase
      .channel(`pix-payment-${paymentId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "payments", filter: `id=eq.${paymentId}` },
        (payload) => setPayment(payload.new as Payment)
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [paymentId]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const secondsLeft = useMemo(() => {
    if (!payment?.pix_expires_at) return null;
    return Math.max(0, Math.floor((new Date(payment.pix_expires_at).getTime() - now) / 1000));
  }, [payment?.pix_expires_at, now]);

  const isExpired = payment?.status === "expired" || (secondsLeft !== null && secondsLeft <= 0 && payment?.status === "pending");

  const copyCode = () => {
    if (!payment?.pix_qr_code) return;
    navigator.clipboard.writeText(payment.pix_qr_code);
    toast.success("Código Pix copiado");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <p className="text-sm text-muted-foreground">Pagamento não encontrado.</p>
        <Link to="/settings?tab=plan" className="text-xs text-primary underline">Voltar para Planos</Link>
      </div>
    );
  }

  if (payment.status === "approved") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 max-w-md mx-auto text-center px-4">
        <CheckCircle2 className="h-10 w-10 text-primary" />
        <h1 className="text-lg font-semibold">Pagamento confirmado!</h1>
        <p className="text-sm text-muted-foreground">Sua assinatura já está ativa.</p>
        <Button onClick={() => navigate("/")}>Ir para o painel</Button>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 max-w-md mx-auto text-center px-4">
        <Clock className="h-10 w-10 text-muted-foreground" />
        <h1 className="text-lg font-semibold">QR Code expirado</h1>
        <p className="text-sm text-muted-foreground">Gere um novo código Pix para continuar.</p>
        <Button onClick={() => navigate(-1)}>Gerar novo Pix</Button>
      </div>
    );
  }

  const minutes = secondsLeft !== null ? Math.floor(secondsLeft / 60) : null;
  const seconds = secondsLeft !== null ? secondsLeft % 60 : null;

  return (
    <div className="flex flex-col items-center gap-6 p-4 md:p-8 max-w-md mx-auto text-center">
      <div>
        <h1 className="text-lg md:text-2xl font-semibold tracking-tight">Pague com Pix</h1>
        <p className="text-sm text-muted-foreground mt-1">Escaneie o QR Code ou copie o código abaixo</p>
      </div>

      <SojCard className="flex flex-col items-center gap-4 p-6 w-full">
        {payment.pix_qr_code_base64 ? (
          <img
            src={`data:image/png;base64,${payment.pix_qr_code_base64}`}
            alt="QR Code Pix"
            className="h-48 w-48 rounded-lg border border-border bg-white p-2"
          />
        ) : (
          <div className="h-48 w-48 rounded-lg border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground">
            QR simulado (mock)
          </div>
        )}

        {minutes !== null && (
          <p className="text-xs font-mono text-muted-foreground tabular-nums">
            Expira em {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </p>
        )}

        <Button variant="outline" onClick={copyCode} className="w-full">
          <Copy className="h-3.5 w-3.5" /> Copiar código Pix
        </Button>
      </SojCard>

      <p className="text-xs text-muted-foreground">
        Assim que o pagamento for confirmado, esta página atualiza automaticamente.
      </p>
    </div>
  );
}
