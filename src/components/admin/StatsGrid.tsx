import { SojCard } from "@/components/layout/Primitives";
import { Building2, FileText, MessageSquare, ScanSearch, UserPlus } from "lucide-react";
import { COST_ANALYSIS_BRL, COST_PARSE_BRL, fmtBRL, type Stats } from "@/lib/adminDashboard";

export function StatsGrid({ stats }: { stats: Stats }) {
  const estimatedCostBRL = stats.contracts_this_month * COST_PARSE_BRL + stats.analyses_this_month * COST_ANALYSIS_BRL;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {[
        { label: "Waitlist",         value: stats.total_waitlist,       icon: UserPlus },
        { label: "Organizações",    value: stats.total_orgs,           icon: Building2 },
        { label: "Contratos/mês",   value: stats.contracts_this_month, icon: FileText },
        { label: "Análises/mês",    value: stats.analyses_this_month,  icon: ScanSearch },
        { label: "Feedbacks",       value: stats.total_feedbacks,      icon: MessageSquare },
      ].map(({ label, value, icon: Icon }) => (
        <SojCard key={label} className="flex flex-col gap-1 p-4">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Icon className="h-3.5 w-3.5" />
            <span className="text-[10px] font-mono uppercase tracking-wider">{label}</span>
          </div>
          <p className="text-2xl font-semibold tabular-nums">{value}</p>
        </SojCard>
      ))}

      {/* Custo estimado */}
      <SojCard className="flex flex-col gap-1 p-4 border-primary/30">
        <div className="flex items-center gap-1.5 text-primary">
          <span className="text-[10px] font-mono uppercase tracking-wider">Custo est. mês</span>
        </div>
        <p className="text-2xl font-semibold tabular-nums text-primary">{fmtBRL(estimatedCostBRL)}</p>
        <p className="text-[10px] text-muted-foreground leading-tight">
          {stats.contracts_this_month} × R$0,05 (parse) + {stats.analyses_this_month} × R$0,45 (análise)
        </p>
      </SojCard>
    </div>
  );
}
