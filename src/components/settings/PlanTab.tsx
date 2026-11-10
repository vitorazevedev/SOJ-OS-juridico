import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SojCard } from "@/components/layout/Primitives";
import { Check, Download, RotateCcw, XCircle, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/lib/supabase";
import { fmtBRL } from "@/lib/adminDashboard";
import { generateReceiptPdf, downloadBlob } from "@/lib/contractDocs";
import { useInvoices, downloadInvoiceFile, type Invoice } from "@/hooks/useInvoices";
import { jsPDF } from "jspdf";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getEdgeFunctionErrorMessage } from "@/lib/edgeFunctionError";
import { DowngradeReasonModal } from "@/components/settings/DowngradeReasonModal";
import { CancelSubscriptionModal } from "@/components/settings/CancelSubscriptionModal";
import { UpdateCardModal } from "@/components/settings/UpdateCardModal";
import {
  FREEMIUM_MONTHLY_ANALYSIS_LIMIT,
  SUBSCRIPTION_RENEWAL_CYCLE_DAYS,
} from "@/lib/pricing";

type Receipt = { id: string; amount_cents: number; description: string; issued_at: string };
type BillingTab = "recibos" | "notas_fiscais";

type BillingPlanRow = {
  code: string;
  name: string;
  price_cents: number;
  sort_order: number;
  features: { monthly_analysis_limit?: number; max_users?: number };
};

// Modulo de Pagamentos, Fase 3 -- planos vêm de billing_plans (fonte da
// verdade desde a Fase 1), não mais hardcoded aqui.
const PLAN_COLOR: Record<string, string> = {
  freemium: "#8A9BB0",
  starter: "#3a8dff",
  individual: "#3a8dff",
  escritorio: "#00e5a0",
  juridico: "#f5a623",
  corporativo: "#a78bfa",
};

const COMMON_FEATS = [
  "Análise jurídica completa por IA",
  "Relatório completo, com exportação",
  "Índice de Desequilíbrio",
  "Geração de contratos",
  "Gestão de obrigações",
];

function featsFor(plan: BillingPlanRow): string[] {
  const limit = plan.features?.monthly_analysis_limit;
  const users = plan.features?.max_users;
  const feats = [
    limit != null ? `Até ${limit} contrato${limit === 1 ? "" : "s"} analisado${limit === 1 ? "" : "s"} por mês` : "Contratos ilimitados",
    ...COMMON_FEATS,
  ];
  if (users != null) feats.push(`Até ${users} usuário${users === 1 ? "" : "s"} na equipe`);
  return feats;
}

const FREEMIUM_INFO = {
  name: "Freemium",
  color: PLAN_COLOR.freemium,
  feats: [
    `${FREEMIUM_MONTHLY_ANALYSIS_LIMIT} contrato analisado por mês`,
    "Análise jurídica completa por IA",
    "Visualização do relatório, sem exportação",
  ],
};

export function PlanTab() {
  const { org, refresh: refreshOrg } = useOrganization();
  const navigate = useNavigate();
  const [monthlyUsed, setMonthlyUsed] = useState<number | null>(null);
  const [receipts, setReceipts] = useState<Receipt[] | null>(null);
  const [billingTab, setBillingTab] = useState<BillingTab>("recibos");
  const { invoices, loading: invoicesLoading } = useInvoices();
  const [plans, setPlans] = useState<BillingPlanRow[] | null>(null);

  type LiveSubscription = { id: string; status: string; cancel_at_period_end: boolean; current_period_end: string | null; grace_period_ends_at: string | null; created_at: string };
  const [liveSubscription, setLiveSubscription] = useState<LiveSubscription | null>(null);
  const [documentType, setDocumentType] = useState<string | null>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [updateCardModalOpen, setUpdateCardModalOpen] = useState(false);

  const fetchLiveSubscription = () => {
    if (!org?.id) return;
    supabase
      .from("subscriptions")
      .select("id, status, cancel_at_period_end, current_period_end, grace_period_ends_at, created_at")
      .eq("organization_id", org.id)
      .in("status", ["incomplete", "trialing", "active", "past_due", "paused"])
      .maybeSingle()
      .then(({ data }) => setLiveSubscription(data as LiveSubscription | null));
  };

  useEffect(fetchLiveSubscription, [org?.id]);

  useEffect(() => {
    if (!org?.id) return;
    supabase
      .from("billing_customers")
      .select("document_type")
      .eq("organization_id", org.id)
      .maybeSingle()
      .then(({ data }) => setDocumentType(data?.document_type ?? null));
  }, [org?.id]);

  useEffect(() => {
    if (!org?.id) return;
    supabase
      .from("billing_receipts")
      .select("id, amount_cents, description, issued_at")
      .eq("org_id", org.id)
      .order("issued_at", { ascending: false })
      .then(({ data }) => setReceipts((data as Receipt[]) ?? []));
  }, [org?.id]);

  useEffect(() => {
    supabase
      .from("billing_plans")
      .select("code, name, price_cents, sort_order, features")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => setPlans((data as BillingPlanRow[]) ?? []));
  }, []);

  const isTrial = org?.plan_status === "trial";
  // "org" e "plans" carregam de fontes independentes -- se "plans" resolver
  // primeiro, o "?? starter" chutava um plano real (Starter legado) e
  // mostrava o card inteiro errado por um instante, até "org" corrigir.
  // Sem "org" carregado, não tenta achar plano nenhum -- cai direto no
  // "Carregando…" abaixo.
  const currentPlanRow = org ? plans?.find((p) => p.code === org.plan_id) : undefined;
  const paidInfo = currentPlanRow
    ? { name: currentPlanRow.name, color: PLAN_COLOR[currentPlanRow.code] ?? "#3a8dff", price: `${fmtBRL(currentPlanRow.price_cents / 100)}/mês`, feats: featsFor(currentPlanRow) }
    : { name: org ? (org.plan_id ?? "") : "Carregando…", color: "#3a8dff", price: "", feats: [] };
  const displayInfo = isTrial ? FREEMIUM_INFO : paidInfo;

  // Planos oferecidos pra assinatura nova no checkout -- freemium (grátis)
  // e starter (legado, só mantido pra quem já está nele) ficam de fora.
  const purchasablePlans = (plans ?? []).filter((p) => p.code !== "freemium" && p.code !== "starter");

  const [downgradeTarget, setDowngradeTarget] = useState<BillingPlanRow | null>(null);
  const [changingPlan, setChangingPlan] = useState(false);

  // Já assinante (não trial/freemium) com uma assinatura viva -- clicar num
  // plano troca via billing-change-plan em vez de ir pro checkout (spec
  // Peça 5: upgrade vale na hora, downgrade só no próximo ciclo). Exige
  // "org" carregado -- sem isso, enquanto carrega, ficaria true por padrão
  // (nem trial nem "freemium" literal) e os botões mostrariam "Fazer
  // upgrade" por um instante até corrigir pra "Assinar".
  const isPayingCustomer = !!org && !isTrial && org.plan_id !== "freemium";

  const callChangePlan = async (planCode: string, reason?: string) => {
    setChangingPlan(true);
    try {
      const { data, error } = await supabase.functions.invoke("billing-change-plan", { body: { plan_id: planCode, reason } });
      if (error || data?.error) {
        const message = data?.error ?? (error ? await getEdgeFunctionErrorMessage(error, "Erro ao trocar de plano.") : "Erro ao trocar de plano.");
        toast.error(message);
        return;
      }
      toast.success(data.applied_immediately ? "Plano atualizado!" : "Troca agendada para a próxima renovação.");
      setDowngradeTarget(null);
      await refreshOrg();
    } finally {
      setChangingPlan(false);
    }
  };

  const isRegretEligible =
    documentType === "CPF" &&
    !!liveSubscription &&
    Date.now() - new Date(liveSubscription.created_at).getTime() <= 7 * 24 * 60 * 60 * 1000;

  const handleCancelConfirm = async (reasonCategory: string, reasonText: string) => {
    setCancelSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("billing-cancel-subscription", {
        body: { action: "cancel", reason_category: reasonCategory, reason_text: reasonText || undefined },
      });
      if (error || data?.error) {
        const message = data?.error ?? (error ? await getEdgeFunctionErrorMessage(error, "Erro ao cancelar.") : "Erro ao cancelar.");
        toast.error(message);
        return;
      }
      const base = data.refunded ? "Assinatura cancelada e pagamento estornado." : "Cancelamento agendado.";
      toast.success(data.protocol ? `${base} Protocolo: ${data.protocol}` : base);
      setCancelModalOpen(false);
      fetchLiveSubscription();
      await refreshOrg();
    } finally {
      setCancelSubmitting(false);
    }
  };

  const handleReactivate = async () => {
    setCancelSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("billing-cancel-subscription", { body: { action: "reactivate" } });
      if (error || data?.error) {
        const message = data?.error ?? (error ? await getEdgeFunctionErrorMessage(error, "Erro ao reativar.") : "Erro ao reativar.");
        toast.error(message);
        return;
      }
      toast.success("Assinatura reativada!");
      fetchLiveSubscription();
      await refreshOrg();
    } finally {
      setCancelSubmitting(false);
    }
  };

  const handlePlanClick = (plan: BillingPlanRow) => {
    if (!isPayingCustomer) {
      navigate(`/checkout?plan=${plan.code}`);
      return;
    }
    const isDowngrade = currentPlanRow ? plan.price_cents < currentPlanRow.price_cents : false;
    if (isDowngrade) {
      setDowngradeTarget(plan);
    } else {
      callChangePlan(plan.code);
    }
  };

  useEffect(() => {
    if (!org?.id || !isTrial) return;
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    supabase
      .from("contracts")
      .select("id", { count: "exact", head: true })
      .eq("org_id", org.id)
      .gte("created_at", startOfMonth.toISOString())
      .then(({ count }) => setMonthlyUsed(count ?? 0));
  }, [org?.id, isTrial]);

  const daysUntilNextMonth = useMemo(() => {
    const now = new Date();
    const firstOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return Math.ceil((firstOfNextMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }, []);
  const monthElapsedPct = useMemo(() => {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return Math.max(0, Math.min(100, (now.getDate() / daysInMonth) * 100));
  }, []);

  const renewalDaysLeft = useMemo(() => {
    if (!org?.plan_renews_at) return null;
    const ms = new Date(org.plan_renews_at).getTime() - Date.now();
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
  }, [org?.plan_renews_at]);
  const renewalPct = renewalDaysLeft != null
    ? Math.max(0, Math.min(100, ((SUBSCRIPTION_RENEWAL_CYCLE_DAYS - renewalDaysLeft) / SUBSCRIPTION_RENEWAL_CYCLE_DAYS) * 100))
    : 0;

  const handleRenew = () => {
    if (!org?.plan_id || org.plan_id === "freemium") return;
    navigate(`/checkout?plan=${org.plan_id}`);
  };

  const freemiumExhausted = isTrial && monthlyUsed != null && monthlyUsed >= FREEMIUM_MONTHLY_ANALYSIS_LIMIT;
  const freemiumRemaining = isTrial && monthlyUsed != null ? Math.max(0, FREEMIUM_MONTHLY_ANALYSIS_LIMIT - monthlyUsed) : null;

  const handleDownloadReceipt = async (r: Receipt) => {
    const blob = await generateReceiptPdf({
      id: r.id,
      amount_cents: r.amount_cents,
      description: r.description,
      issued_at: r.issued_at,
      org_name: org?.name ?? "—",
      org_cnpj: org?.cnpj ?? null,
    });
    downloadBlob(blob, `recibo-ponderum-${r.id.slice(0, 8)}.pdf`);
  };

  // Fase 5c -- notas emitidas pelo MockInvoiceProvider não têm arquivo real
  // no Storage (file_path = 'mock-nfse:<id>'). Em vez de buscar um arquivo
  // que não existe, gera um PDF no navegador, claramente rotulado como
  // simulação -- nunca fabrica algo parecido com nota fiscal de verdade.
  const handleDownloadInvoice = async (inv: Invoice) => {
    if (inv.file_path.startsWith("mock-nfse:")) {
      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      pdf.setFillColor(220, 38, 38);
      pdf.rect(0, 0, 210, 18, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.text("SIMULAÇÃO — SEM VALOR FISCAL", 20, 12);

      pdf.setTextColor(20, 20, 20);
      pdf.setFontSize(14);
      pdf.text("Nota fiscal simulada (ambiente de teste)", 20, 35);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      const lines: [string, string][] = [
        ["Número", inv.numero_nota],
        ["Valor", fmtBRL(inv.valor_cents / 100)],
        ["Data de emissão", new Date(`${inv.data_emissao}T00:00:00`).toLocaleDateString("pt-BR")],
      ];
      let y = 50;
      for (const [label, value] of lines) {
        pdf.text(`${label}: ${value}`, 20, y);
        y += 8;
      }
      pdf.setFontSize(8);
      pdf.setTextColor(120, 120, 120);
      pdf.text("Gerado automaticamente em modo de teste (PAYMENT_PROVIDER=mock). Não é um documento fiscal válido.", 20, y + 10);

      downloadBlob(new Blob([pdf.output("arraybuffer")], { type: "application/pdf" }), `nfse-simulada-${inv.numero_nota}.pdf`);
      return;
    }

    const url = await downloadInvoiceFile(inv.file_path);
    if (url) window.open(url, "_blank");
  };

  return (
    <div className="flex flex-col gap-4 mt-4">
      <SojCard className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-medium text-sm md:text-base">Plano Atual</h3>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xl font-bold" style={{ color: displayInfo.color }}>
                {displayInfo.name}
              </span>
            </div>
            {!isTrial && <p className="text-sm text-muted-foreground mt-1">{paidInfo.price}</p>}
          </div>
          {!isTrial && (
            <button
              onClick={handleRenew}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
            >
              Trocar forma de pagamento
            </button>
          )}
        </div>

        {isTrial ? (
          monthlyUsed != null && (
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3">
              {freemiumExhausted ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Limite gratuito do mês atingido</span>
                    <span className="text-xs font-semibold tabular-nums">
                      {daysUntilNextMonth} {daysUntilNextMonth === 1 ? "dia" : "dias"} para nova análise
                    </span>
                  </div>
                  <Progress value={monthElapsedPct} />
                </>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Você tem {freemiumRemaining} {freemiumRemaining === 1 ? "análise gratuita disponível" : "análises gratuitas disponíveis"} este mês
                </span>
              )}
            </div>
          )
        ) : (
          renewalDaysLeft != null && (
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Assinatura {paidInfo.name}</span>
                <span className="text-xs font-semibold tabular-nums">
                  {renewalDaysLeft <= 0
                    ? "Renovação pendente"
                    : `${renewalDaysLeft} ${renewalDaysLeft === 1 ? "dia" : "dias"} para renovação`}
                </span>
              </div>
              <Progress value={renewalPct} />
            </div>
          )
        )}

        {liveSubscription?.status === "past_due" && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-risk-critical/30 bg-risk-critical-dim p-3 flex-wrap">
            <div className="flex items-center gap-2 text-xs text-risk-critical">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Não conseguimos cobrar seu cartão
              {liveSubscription.grace_period_ends_at &&
                ` — você tem até ${new Date(liveSubscription.grace_period_ends_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })} para atualizar a forma de pagamento`}
            </div>
            <button
              onClick={() => setUpdateCardModalOpen(true)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-risk-critical text-white text-xs hover:opacity-90 transition-opacity shrink-0"
            >
              Atualizar forma de pagamento
            </button>
          </div>
        )}

        {liveSubscription?.cancel_at_period_end && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-risk-high/30 bg-risk-high-dim p-3 flex-wrap">
            <div className="flex items-center gap-2 text-xs text-risk-high">
              <XCircle className="h-3.5 w-3.5 shrink-0" />
              Cancelamento agendado para{" "}
              {liveSubscription.current_period_end &&
                new Date(liveSubscription.current_period_end).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}
            </div>
            <button
              onClick={handleReactivate}
              disabled={cancelSubmitting}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs hover:bg-muted/40 transition-colors disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reativar assinatura
            </button>
          </div>
        )}

        <ul className="flex flex-col gap-1.5 mt-2">
          {displayInfo.feats.map((f) => (
            <li key={f} className="flex items-start gap-2 text-xs">
              <Check className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: displayInfo.color }} />
              <span className="text-foreground/90">{f}</span>
            </li>
          ))}
        </ul>

        {!isTrial && liveSubscription && !liveSubscription.cancel_at_period_end && (
          <button
            onClick={() => setCancelModalOpen(true)}
            className="self-start text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            Cancelar assinatura
          </button>
        )}

        {org?.created_at && (
          <p className="text-xs text-muted-foreground pt-3 border-t border-border">
            Organização criada em{" "}
            {new Date(org.created_at).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
        )}
      </SojCard>

      {purchasablePlans.length > 0 && (
        <SojCard className="flex flex-col gap-4">
          <div>
            <h3 className="font-medium text-sm md:text-base">Planos disponíveis</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Mude de plano a qualquer momento</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {purchasablePlans.map((p) => {
              const isCurrent = org?.plan_id === p.code && (org?.plan_status === "active" || org?.plan_status === "suspended");
              const color = PLAN_COLOR[p.code] ?? "#3a8dff";
              return (
                <div key={p.code} className="flex flex-col gap-3 rounded-lg border border-border p-4">
                  <div>
                    <span className="text-sm font-semibold" style={{ color }}>{p.name}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">{fmtBRL(p.price_cents / 100)}/mês</p>
                  </div>
                  <ul className="flex flex-col gap-1">
                    {featsFor(p).slice(0, 3).map((f) => (
                      <li key={f} className="flex items-start gap-1.5 text-[11px] text-foreground/80">
                        <Check className="h-3 w-3 shrink-0 mt-0.5" style={{ color }} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handlePlanClick(p)}
                    disabled={isCurrent || changingPlan}
                    className="h-9 rounded-lg border border-border text-xs font-medium hover:bg-muted/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCurrent
                      ? "Plano atual"
                      : !isPayingCustomer
                        ? "Assinar"
                        : currentPlanRow && p.price_cents < currentPlanRow.price_cents
                          ? "Fazer downgrade"
                          : "Fazer upgrade"}
                  </button>
                </div>
              );
            })}
          </div>
        </SojCard>
      )}

      <SojCard className="flex flex-col gap-4">
        <div>
          <h3 className="font-medium text-sm md:text-base">Histórico de Faturamento</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Faturas e recibos da sua organização</p>
        </div>

        <div className="flex gap-1 border-b border-border">
          {([
            ["recibos", "Recibos"],
            ["notas_fiscais", "Notas fiscais"],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setBillingTab(id)}
              className={cn(
                "px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors",
                billingTab === id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {billingTab === "recibos" ? (
          receipts == null ? null : receipts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Nenhum recibo ainda. Recibos aparecem aqui após a confirmação de um pagamento.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {receipts.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div>
                    <p className="font-medium">{r.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(r.issued_at).toLocaleString("pt-BR", {
                        day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-semibold tabular-nums">{fmtBRL(r.amount_cents / 100)}</span>
                    <button
                      onClick={() => handleDownloadReceipt(r)}
                      className="flex items-center gap-1 h-8 px-3 rounded-lg border border-border text-xs hover:bg-muted/40 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" /> PDF
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : invoicesLoading ? null : invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Nenhuma nota fiscal disponível ainda.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {invoices.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="font-medium">Nota fiscal Nº {inv.numero_nota}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Emitida em{" "}
                    {new Date(`${inv.data_emissao}T00:00:00`).toLocaleDateString("pt-BR", {
                      day: "2-digit", month: "long", year: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-semibold tabular-nums">{fmtBRL(inv.valor_cents / 100)}</span>
                  <button
                    onClick={() => handleDownloadInvoice(inv)}
                    className="flex items-center gap-1 h-8 px-3 rounded-lg border border-border text-xs hover:bg-muted/40 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" /> Baixar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SojCard>

      {downgradeTarget && (
        <DowngradeReasonModal
          open={!!downgradeTarget}
          onOpenChange={(open) => !open && setDowngradeTarget(null)}
          fromPlanName={paidInfo.name}
          toPlanName={downgradeTarget.name}
          submitting={changingPlan}
          onConfirm={(reason) => callChangePlan(downgradeTarget.code, reason)}
        />
      )}

      <CancelSubscriptionModal
        open={cancelModalOpen}
        onOpenChange={setCancelModalOpen}
        accessUntilLabel={
          liveSubscription?.current_period_end
            ? new Date(liveSubscription.current_period_end).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })
            : null
        }
        isRegretEligible={isRegretEligible}
        submitting={cancelSubmitting}
        onConfirm={handleCancelConfirm}
      />

      <UpdateCardModal
        open={updateCardModalOpen}
        onOpenChange={setUpdateCardModalOpen}
        onUpdated={fetchLiveSubscription}
      />
    </div>
  );
}
