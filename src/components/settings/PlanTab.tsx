import { useEffect, useMemo, useState } from "react";
import { SojCard } from "@/components/layout/Primitives";
import { Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/lib/supabase";
import {
  STARTER_MONTHLY_PRICE_BRL,
  FREEMIUM_MONTHLY_ANALYSIS_LIMIT,
  SUBSCRIPTION_RENEWAL_CYCLE_DAYS,
} from "@/lib/pricing";

// Mesmo numero de WhatsApp comercial usado na landing page.
const SALES_WHATSAPP = "5511964889002";

const FREEMIUM_INFO = {
  name: "Freemium",
  color: "#8A9BB0",
  feats: [
    `${FREEMIUM_MONTHLY_ANALYSIS_LIMIT} contrato analisado por mês`,
    "Análise jurídica completa por IA",
    "Visualização do relatório, sem exportação",
  ],
};

const PLAN_INFO: Record<string, { name: string; color: string; price: string; feats: string[] }> = {
  starter: {
    name: "Starter",
    color: "#3a8dff",
    price: `R$ ${STARTER_MONTHLY_PRICE_BRL}/mês`,
    feats: ["5 contratos/mês", "Análise jurídica IA", "Score de risco", "Export PDF"],
  },
  pro: {
    name: "Pro",
    color: "#00e5a0",
    price: "R$ 397/mês",
    feats: [
      "Contratos ilimitados",
      "Impacto financeiro",
      "Word com Redlines",
      "Alertas de vencimento",
      "Gerador de contratos",
    ],
  },
  enterprise: {
    name: "Enterprise",
    color: "#f5a623",
    price: "Sob consulta",
    feats: ["Tudo do Pro", "Multi-tenancy", "SSO + LDAP", "SLA garantido"],
  },
};

export function PlanTab() {
  const { org } = useOrganization();
  const [monthlyUsed, setMonthlyUsed] = useState<number | null>(null);

  const isTrial = org?.plan_status === "trial";
  const paidInfo = PLAN_INFO[org?.plan_id ?? "starter"] ?? PLAN_INFO.starter;
  const displayInfo = isTrial ? FREEMIUM_INFO : paidInfo;

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

  const handlePlanActionClick = () => {
    const message = isTrial
      ? `Olá! Sou da organização "${org?.name ?? ""}" e quero fazer upgrade para o plano Starter da Ponderum.`
      : `Olá! Sou da organização "${org?.name ?? ""}" e quero renovar minha assinatura do plano Starter da Ponderum.`;
    window.open(`https://wa.me/${SALES_WHATSAPP}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const freemiumExhausted = isTrial && monthlyUsed != null && monthlyUsed >= FREEMIUM_MONTHLY_ANALYSIS_LIMIT;
  const freemiumRemaining = isTrial && monthlyUsed != null ? Math.max(0, FREEMIUM_MONTHLY_ANALYSIS_LIMIT - monthlyUsed) : null;

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
          <button
            onClick={handlePlanActionClick}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
          >
            {isTrial ? "Fazer upgrade" : "Renovar assinatura"}
          </button>
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
                <span className="text-xs text-muted-foreground">Assinatura Starter</span>
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

        <ul className="flex flex-col gap-1.5 mt-2">
          {displayInfo.feats.map((f) => (
            <li key={f} className="flex items-start gap-2 text-xs">
              <Check className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: displayInfo.color }} />
              <span className="text-foreground/90">{f}</span>
            </li>
          ))}
        </ul>

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

      <SojCard className="flex flex-col gap-4">
        <div>
          <h3 className="font-medium text-sm md:text-base">Histórico de Faturamento</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Faturas e recibos da sua organização</p>
        </div>
        <p className="text-sm text-muted-foreground py-6 text-center">
          Histórico de faturamento estará disponível quando os planos pagos forem lançados.
        </p>
      </SojCard>
    </div>
  );
}
