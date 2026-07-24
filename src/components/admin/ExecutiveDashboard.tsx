import { useEffect, useState } from "react";
import { SojCard } from "@/components/layout/Primitives";
import { supabase } from "@/lib/supabase";
import { fmtBRL } from "@/lib/adminDashboard";
import { Loader2, TrendingUp, Users, Building2, ShieldAlert } from "lucide-react";

type ExecStats = {
  total_orgs: number;
  starter_count: number;
  freemium_count: number;
  blocked_count: number;
  mrr_estimate: number;
  churned_30d: number;
  churn_rate_30d: number;
};

type MonthCount = { month: string; new_orgs: number };

export function ExecutiveDashboard() {
  const [stats, setStats] = useState<ExecStats | null>(null);
  const [growth, setGrowth] = useState<MonthCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.rpc("get_executive_dashboard").then(({ data, error }) => {
      if (error || !data) {
        setLoading(false);
        return;
      }
      const d = data as unknown as { stats: ExecStats; growth_monthly: MonthCount[] };
      setStats(d.stats);
      setGrowth(d.growth_monthly ?? []);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <SojCard className="flex items-center justify-center p-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </SojCard>
    );
  }

  if (!stats) return null;

  const maxNewOrgs = Math.max(...growth.map((g) => g.new_orgs), 1);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SojCard className="flex flex-col gap-1 p-4 border-primary/30">
          <div className="flex items-center gap-1.5 text-primary">
            <TrendingUp className="h-3.5 w-3.5" />
            <span className="text-[10px] font-mono uppercase tracking-wider">MRR estimado</span>
          </div>
          <p className="text-2xl font-semibold tabular-nums text-primary">{fmtBRL(stats.mrr_estimate)}</p>
          <p className="text-[10px] text-muted-foreground leading-tight">
            {stats.starter_count} conta(s) Starter × preço atual do plano
          </p>
        </SojCard>

        <SojCard className="flex flex-col gap-1 p-4">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" />
            <span className="text-[10px] font-mono uppercase tracking-wider">Clientes por plano</span>
          </div>
          <p className="text-2xl font-semibold tabular-nums">{stats.total_orgs}</p>
          <p className="text-[10px] text-muted-foreground leading-tight">
            {stats.starter_count} Starter · {stats.freemium_count} Freemium
          </p>
        </SojCard>

        <SojCard className="flex flex-col gap-1 p-4">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span className="text-[10px] font-mono uppercase tracking-wider">Churn (30 dias)</span>
          </div>
          <p className="text-2xl font-semibold tabular-nums">{stats.churn_rate_30d}%</p>
          <p className="text-[10px] text-muted-foreground leading-tight">
            {stats.churned_30d} conta(s) rebaixada(s) de Starter para Freemium
          </p>
        </SojCard>

        <SojCard className="flex flex-col gap-1 p-4">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <ShieldAlert className="h-3.5 w-3.5" />
            <span className="text-[10px] font-mono uppercase tracking-wider">Bloqueadas</span>
          </div>
          <p className="text-2xl font-semibold tabular-nums">{stats.blocked_count}</p>
          <p className="text-[10px] text-muted-foreground leading-tight">Análises suspensas no momento</p>
        </SojCard>
      </div>

      <SojCard className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-medium">Crescimento — novos cadastros por mês</h2>
        </div>
        <div className="flex items-end gap-2 h-24">
          {growth.map(({ month, new_orgs }) => (
            <div key={month} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] tabular-nums text-muted-foreground">{new_orgs > 0 ? new_orgs : ""}</span>
              <div
                className="w-full rounded-t-md bg-primary/70 transition-all"
                style={{ height: `${Math.max((new_orgs / maxNewOrgs) * 80, new_orgs > 0 ? 6 : 2)}px` }}
              />
              <span className="text-[10px] text-muted-foreground font-mono">{month}</span>
            </div>
          ))}
        </div>
      </SojCard>
    </div>
  );
}
