import { useMemo, useState } from "react";
import { SojCard } from "@/components/layout/Primitives";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useOrganization } from "@/hooks/useOrganization";

const PLAN_INFO: Record<string, { name: string; color: string; price: string; feats: string[] }> = {
  starter: {
    name: "Starter",
    color: "#3a8dff",
    price: "R$ 147/mês",
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
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const trialDaysLeft = useMemo(() => {
    if (!org?.trial_ends_at) return null;
    const ms = new Date(org.trial_ends_at).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  }, [org]);
  const trialPct = trialDaysLeft != null ? Math.max(0, Math.min(100, (trialDaysLeft / 7) * 100)) : 0;

  const planInfo = PLAN_INFO[org?.plan_id ?? "starter"] ?? PLAN_INFO.starter;
  const isTrial = org?.plan_status === "trial";

  return (
    <div className="flex flex-col gap-4 mt-4">
      <SojCard className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-medium text-sm md:text-base">Plano Atual</h3>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xl font-bold" style={{ color: planInfo.color }}>
                {planInfo.name}
              </span>
              <span
                className={cn(
                  "text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full",
                  isTrial
                    ? "bg-risk-medium-dim text-risk-medium"
                    : org?.plan_status === "active"
                    ? "bg-primary-dim text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {org?.plan_status ?? "—"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{planInfo.price}</p>
          </div>
          <button
            onClick={() => setUpgradeOpen(true)}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
          >
            Fazer upgrade
          </button>
        </div>

        {isTrial && trialDaysLeft != null && (
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Período de teste em andamento</span>
              <span className="text-xs font-semibold tabular-nums">
                {trialDaysLeft} {trialDaysLeft === 1 ? "dia restante" : "dias restantes"}
              </span>
            </div>
            <Progress value={trialPct} />
          </div>
        )}

        <ul className="flex flex-col gap-1.5 mt-2">
          {planInfo.feats.map((f) => (
            <li key={f} className="flex items-start gap-2 text-xs">
              <Check className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: planInfo.color }} />
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

      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Fazer upgrade</DialogTitle>
            <DialogDescription>
              Entre em contato com nossa equipe para fazer upgrade:{" "}
              <a href="mailto:contato@soj.com.br" className="text-primary font-medium">
                contato@soj.com.br
              </a>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button onClick={() => setUpgradeOpen(false)} className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
              Entendi
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
