import { useNavigate } from "react-router-dom";
import { SojCard, RiskBadge } from "@/components/layout/Primitives";
import { FileText, TrendingUp } from "lucide-react";
import type { RecentContract } from "@/hooks/useDashboard";

export function TopRisksCard({ loading, topRisks }: { loading: boolean; topRisks: RecentContract[] }) {
  const navigate = useNavigate();

  return (
    <SojCard>
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-4 w-4 text-risk-critical" />
        <h3 className="font-medium text-sm md:text-base">Top Riscos</h3>
      </div>
      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex justify-between items-center animate-pulse">
              <div className="h-3 w-32 bg-muted/60 rounded" />
              <div className="h-5 w-16 bg-muted/40 rounded-full" />
            </div>
          ))}
        </div>
      ) : topRisks.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Nenhum contrato analisado ainda</p>
          <button onClick={() => navigate("/contracts")} className="text-xs text-primary hover:underline">
            Fazer upload →
          </button>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {topRisks.map((c) => (
            <button
              key={c.id}
              onClick={() => navigate(`/analysis/${c.id}`)}
              className="flex items-center justify-between gap-3 py-3 text-left hover:opacity-80 active:opacity-60 transition-opacity first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{c.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{c.type ?? c.party ?? "—"}</p>
              </div>
              {c.risk_score != null && <RiskBadge score={c.risk_score} />}
            </button>
          ))}
        </div>
      )}
    </SojCard>
  );
}
