import { useNavigate } from "react-router-dom";
import { SojCard } from "@/components/layout/Primitives";
import { VolumeExposureChart } from "@/components/layout/Charts";
import { useDashboard } from "@/hooks/useDashboard";
import { useAuth } from "@/features/auth/components/AuthProvider";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";
import { WelcomeHero } from "@/components/dashboard/WelcomeHero";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { TopRisksCard } from "@/components/dashboard/TopRisksCard";
import { UpcomingObligationsCard } from "@/components/dashboard/UpcomingObligationsCard";
import { RecentContractsTable } from "@/components/dashboard/RecentContractsTable";
import { formatBRL, formatToday, greeting } from "@/lib/dashboardFormat";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { summary, recentContracts, topRisks, upcoming, loading } = useDashboard();

  const firstName =
    (user?.user_metadata?.name as string | undefined)?.split(" ")[0] ??
    user?.email?.split("@")[0] ?? "Usuário";

  const isEmpty = !loading && summary.total_contracts === 0;

  return (
    <div className="flex flex-col gap-4 md:gap-6 max-w-[1400px] mx-auto animate-fade-in">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            {greeting()}, {firstName}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Portfólio jurídico · {formatToday()}</p>
        </div>
        {!isEmpty && summary.urgent_obligations > 0 && (
          <button
            onClick={() => navigate("/obligations")}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-risk-critical-dim text-risk-critical text-xs font-medium hover:opacity-80 transition-opacity"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            {summary.urgent_obligations} {summary.urgent_obligations > 1 ? "obrigações urgentes" : "obrigação urgente"}
          </button>
        )}
      </div>

      {/* First-run: no contracts yet */}
      {isEmpty && (
        <WelcomeHero
          onUpload={() => navigate("/contracts")}
          onGenerate={() => navigate("/generator")}
        />
      )}

      {/* KPIs */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SojCard key={i} className="p-3.5 md:p-5 animate-pulse">
              <div className="h-3 w-24 bg-muted/60 rounded mb-3" />
              <div className="h-8 w-16 bg-muted/60 rounded mb-2" />
              <div className="h-2.5 w-20 bg-muted/40 rounded" />
            </SojCard>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-4">
          <KpiCard
            label="Total de contratos"
            value={String(summary.total_contracts)}
            hint="Na sua organização"
          />
          <KpiCard
            label="Exposição total"
            value={summary.total_exposure_cents > 0 ? formatBRL(summary.total_exposure_cents) : "—"}
            hint="Soma das análises de risco"
            highlight={summary.total_exposure_cents > 0}
          />
          <KpiCard
            label="Score médio de risco"
            value={summary.avg_risk_score > 0 ? String(Math.round(summary.avg_risk_score)) : "—"}
            hint="Contratos analisados"
            highlight={summary.avg_risk_score >= 65}
          />
          <KpiCard
            label="Obrigações pendentes"
            value={String(summary.pending_obligations)}
            hint="Nos próximos 30 dias"
            highlight={summary.urgent_obligations > 0}
          />
        </div>
      )}

      {/* Chart */}
      <SojCard>
        <div className="flex items-start justify-between mb-1">
          <div>
            <h3 className="font-medium text-sm md:text-base">Volume & Exposição Financeira</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Contratos analisados e exposição acumulada por mês</p>
          </div>
        </div>
        <VolumeExposureChart />
      </SojCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <TopRisksCard loading={loading} topRisks={topRisks} />
        <UpcomingObligationsCard loading={loading} upcoming={upcoming} />
      </div>

      <RecentContractsTable loading={loading} recentContracts={recentContracts} />

      {/* Resumo de status (só aparece quando há contratos) */}
      {!loading && summary.total_contracts > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Analisados", count: recentContracts.filter(c => c.status === "analisado").length, color: "text-primary", bg: "bg-primary-dim" },
            { label: "Em análise", count: recentContracts.filter(c => c.status === "em_analise").length, color: "text-info", bg: "bg-info-dim" },
            { label: "Aguardando", count: recentContracts.filter(c => c.status === "aguardando").length, color: "text-muted-foreground", bg: "bg-muted/30" },
          ].map((s) => (
            <button
              key={s.label}
              onClick={() => navigate("/contracts")}
              className={cn("rounded-xl p-3 md:p-4 text-center hover:opacity-80 transition-opacity", s.bg)}
            >
              <p className={cn("text-2xl md:text-3xl font-semibold tabular-nums", s.color)}>{s.count}</p>
              <p className="text-[11px] md:text-xs text-muted-foreground mt-1">{s.label}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
