import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { SojCard } from "@/components/layout/Primitives";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, CreditCard, QrCode, CheckCircle2, XCircle, Clock, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { CardBrick } from "@/components/billing/CardBrick";
import { isValidDocument, formatCPF, formatCNPJ, onlyDigits, lookupCep } from "@/lib/documentValidation";
import { fmtBRL } from "@/lib/adminDashboard";
import { getEdgeFunctionErrorMessage } from "@/lib/edgeFunctionError";
import { PIX_ENABLED } from "@/lib/pricing";

type BillingPlan = { code: string; name: string; price_cents: number };
type SubscriptionStatus = "incomplete" | "trialing" | "active" | "past_due" | "paused" | "canceled" | "expired";


export default function Checkout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const planCode = searchParams.get("plan");

  const [plan, setPlan] = useState<BillingPlan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);

  const [documentType, setDocumentType] = useState<"CPF" | "CNPJ">("CNPJ");
  const [legalName, setLegalName] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [email, setEmail] = useState("");
  const [cep, setCep] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [localidade, setLocalidade] = useState("");
  const [uf, setUf] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "pix">("card");
  const [cardToken, setCardToken] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [paymentRejected, setPaymentRejected] = useState(false);
  const [activationTimedOut, setActivationTimedOut] = useState(false);

  useEffect(() => {
    if (!planCode) {
      setLoadingPlan(false);
      return;
    }
    supabase
      .from("billing_plans")
      .select("code, name, price_cents")
      .eq("code", planCode)
      .eq("is_active", true)
      .maybeSingle()
      .then(({ data }) => {
        setPlan(data as BillingPlan | null);
        setLoadingPlan(false);
      });
  }, [planCode]);

  useEffect(() => {
    if (!subscriptionId) return;
    const channel = supabase
      .channel(`checkout-subscription-${subscriptionId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "subscriptions", filter: `id=eq.${subscriptionId}` },
        (payload) => setSubscriptionStatus(payload.new.status as SubscriptionStatus)
      )
      // Primeira cobrança recusada não muda o status da assinatura (ela
      // fica 'incomplete', pronta pra nova tentativa -- não existe aresta
      // incomplete->past_due na máquina de estados). Sem isto, a tela
      // ficaria girando pra sempre sem avisar que o cartão foi recusado.
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "payments", filter: `subscription_id=eq.${subscriptionId}` },
        (payload) => { if (payload.new.status === "rejected") setPaymentRejected(true); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [subscriptionId]);

  // Rede de segurança: se nenhum evento chegar (ex.: falha de rede no
  // Realtime), não deixa a pessoa olhando pro spinner indefinidamente.
  useEffect(() => {
    if (!subscriptionId || subscriptionStatus === "active" || paymentRejected) return;
    const timeout = setTimeout(() => setActivationTimedOut(true), 25000);
    return () => clearTimeout(timeout);
  }, [subscriptionId, subscriptionStatus, paymentRejected]);

  const handleCepBlur = async () => {
    const addr = await lookupCep(cep);
    if (!addr) {
      toast.error("CEP não encontrado");
      return;
    }
    setLogradouro(addr.logradouro);
    setBairro(addr.bairro);
    setLocalidade(addr.localidade);
    setUf(addr.uf);
  };

  const documentDigits = onlyDigits(documentNumber);
  const documentValid = documentDigits.length > 0 && isValidDocument(documentDigits, documentType);
  const canSubmit =
    !!plan &&
    legalName.trim().length > 0 &&
    documentValid &&
    /^\S+@\S+\.\S+$/.test(email) &&
    onlyDigits(cep).length === 8 &&
    numero.trim().length > 0 &&
    termsAccepted &&
    (paymentMethod === "pix" || !!cardToken);

  const handleSubmit = async () => {
    if (!canSubmit || !plan) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-mercadopago-subscription", {
        body: {
          plan_id: plan.code,
          payment_method: paymentMethod,
          cardToken: paymentMethod === "card" ? cardToken : undefined,
          billing: {
            legal_name: legalName,
            document_type: documentType,
            document_number: documentDigits,
            email,
            address: { cep: onlyDigits(cep), logradouro, numero, complemento, bairro, localidade, uf },
          },
        },
      });

      if (error || data?.error) {
        const message = data?.error ?? (error ? await getEdgeFunctionErrorMessage(error, "Erro ao processar pagamento. Tente novamente.") : "Erro ao processar pagamento. Tente novamente.");
        toast.error(message);
        return;
      }

      if (paymentMethod === "pix") {
        navigate(`/checkout/pix/${data.payment_id}`);
        return;
      }

      setSubscriptionId(data.subscription_id);
      setSubscriptionStatus("incomplete");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingPlan) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <p className="text-sm text-muted-foreground">Plano não encontrado.</p>
        <Link to="/settings?tab=plan" className="text-xs text-primary underline">Voltar para Planos</Link>
      </div>
    );
  }

  if (subscriptionId) {
    const isActive = subscriptionStatus === "active";
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 max-w-md mx-auto text-center px-4">
        {isActive ? (
          <>
            <CheckCircle2 className="h-10 w-10 text-primary" />
            <h1 className="text-lg font-semibold">Assinatura ativa!</h1>
            <p className="text-sm text-muted-foreground">Seu plano {plan.name} já está disponível.</p>
            <Button onClick={() => navigate("/")}>Ir para o painel</Button>
          </>
        ) : paymentRejected ? (
          <>
            <XCircle className="h-10 w-10 text-destructive" />
            <h1 className="text-lg font-semibold">Pagamento recusado</h1>
            <p className="text-sm text-muted-foreground">
              Não foi possível aprovar o pagamento com esse cartão. Verifique os dados ou tente outro cartão.
            </p>
            <Button onClick={() => navigate(`/checkout?plan=${plan.code}`)}>Tentar novamente</Button>
          </>
        ) : activationTimedOut ? (
          <>
            <Clock className="h-10 w-10 text-muted-foreground" />
            <h1 className="text-lg font-semibold">Isso está demorando mais que o esperado</h1>
            <p className="text-sm text-muted-foreground">
              Ainda não conseguimos confirmar o pagamento. Você pode aguardar mais um pouco ou verificar o status do seu plano em Configurações.
            </p>
            <Button variant="outline" onClick={() => navigate("/settings?tab=plan")}>Ver em Configurações</Button>
          </>
        ) : (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <h1 className="text-lg font-semibold">Ativando sua assinatura…</h1>
            <p className="text-sm text-muted-foreground">
              Estamos confirmando o pagamento com a operadora do cartão. Isso pode levar alguns instantes.
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/settings?tab=plan")} className="gap-1.5 -ml-2">
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar para planos
        </Button>
      </div>
      <div>
        <h1 className="text-lg md:text-2xl font-semibold tracking-tight">Finalizar assinatura</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Plano <span className="font-medium text-foreground">{plan.name}</span> — {fmtBRL(plan.price_cents / 100)}/mês
        </p>
      </div>

      <SojCard className="flex flex-col gap-4 p-5">
        <h3 className="text-sm font-medium">Dados de faturamento</h3>

        <RadioGroup value={documentType} onValueChange={(v) => setDocumentType(v as "CPF" | "CNPJ")} className="flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="CNPJ" /> CNPJ
          </label>
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="CPF" /> CPF
          </label>
        </RadioGroup>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">{documentType === "CNPJ" ? "Razão social" : "Nome completo"}</Label>
          <Input value={legalName} onChange={(e) => setLegalName(e.target.value)} />
        </div>

        <div className="flex gap-2">
          <div className="flex flex-col gap-1.5 flex-1">
            <Label className="text-xs">{documentType}</Label>
            <Input
              value={documentType === "CNPJ" ? formatCNPJ(documentNumber) : formatCPF(documentNumber)}
              onChange={(e) => setDocumentNumber(e.target.value)}
              className={documentNumber && !documentValid ? "border-destructive" : ""}
            />
          </div>
          <div className="flex flex-col gap-1.5 flex-1">
            <Label className="text-xs">E-mail de faturamento</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>

        <div className="flex gap-2">
          <div className="flex flex-col gap-1.5 w-32">
            <Label className="text-xs">CEP</Label>
            <Input value={cep} onChange={(e) => setCep(e.target.value)} onBlur={handleCepBlur} />
          </div>
          <div className="flex flex-col gap-1.5 flex-1">
            <Label className="text-xs">Endereço</Label>
            <Input value={logradouro} onChange={(e) => setLogradouro(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex flex-col gap-1.5 w-24">
            <Label className="text-xs">Número</Label>
            <Input value={numero} onChange={(e) => setNumero(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5 flex-1">
            <Label className="text-xs">Complemento</Label>
            <Input value={complemento} onChange={(e) => setComplemento(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5 flex-1">
            <Label className="text-xs">Bairro</Label>
            <Input value={bairro} onChange={(e) => setBairro(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex flex-col gap-1.5 flex-1">
            <Label className="text-xs">Cidade</Label>
            <Input value={localidade} onChange={(e) => setLocalidade(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5 w-20">
            <Label className="text-xs">UF</Label>
            <Input value={uf} onChange={(e) => setUf(e.target.value.toUpperCase().slice(0, 2))} />
          </div>
        </div>
      </SojCard>

      <SojCard className="flex flex-col gap-4 p-5">
        <h3 className="text-sm font-medium">Forma de pagamento</h3>

        {PIX_ENABLED && (
          <div className="flex gap-2">
            <button
              onClick={() => setPaymentMethod("card")}
              className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-lg border text-sm transition-colors ${
                paymentMethod === "card" ? "border-primary text-primary bg-primary-dim" : "border-border text-muted-foreground"
              }`}
            >
              <CreditCard className="h-4 w-4" /> Cartão
            </button>
            <button
              onClick={() => setPaymentMethod("pix")}
              className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-lg border text-sm transition-colors ${
                paymentMethod === "pix" ? "border-primary text-primary bg-primary-dim" : "border-border text-muted-foreground"
              }`}
            >
              <QrCode className="h-4 w-4" /> Pix
            </button>
          </div>
        )}

        {paymentMethod === "card" && plan && <CardBrick onToken={setCardToken} amount={plan.price_cents / 100} payerEmail={email} />}
      </SojCard>

      <label className="flex items-start gap-2 text-xs text-muted-foreground">
        <Checkbox checked={termsAccepted} onCheckedChange={(v) => setTermsAccepted(v === true)} className="mt-0.5" />
        Li e aceito os <Link to="/termos" target="_blank" className="text-primary underline">Termos de Uso</Link> da Ponderum.
      </label>

      <Button onClick={handleSubmit} disabled={!canSubmit || submitting} size="lg">
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {paymentMethod === "card" ? "Confirmar assinatura" : "Gerar Pix"}
      </Button>
    </div>
  );
}
