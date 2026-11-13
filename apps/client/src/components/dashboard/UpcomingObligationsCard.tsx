import { useNavigate } from "react-router-dom";
import { SojCard } from "@/components/layout/Primitives";
import { CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { daysUntil, fmtDate } from "@/lib/dashboardFormat";
import type { UpcomingObligation } from "@/hooks/useDashboard";

export function UpcomingObligationsCard({ loading, upcoming }: { loading: boolean; upcoming: UpcomingObligation[] }) {
  const navigate = useNavigate();

  return (
    <SojCard className="lg:col-span-2">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium text-sm md:text-base">Obrigações Próximas</h3>
        </div>
        <button onClick={() => navigate("/obligations")} className="text-xs text-primary hover:underline">
          Ver todas →
        </button>
      </div>
      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex justify-between items-center animate-pulse">
              <div className="h-3 w-48 bg-muted/60 rounded" />
              <div className="h-5 w-20 bg-muted/40 rounded-full" />
            </div>
          ))}
        </div>
      ) : upcoming.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <CalendarClock className="h-5 w-5 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Nenhuma obrigação nos próximos 30 dias</p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {upcoming.map((o) => {
            const days = daysUntil(o.due_date);
            const urgent = days <= 7;
            return (
              <button
                key={o.id}
                onClick={() => navigate("/obligations")}
                className="flex items-center justify-between gap-3 py-3 text-left hover:opacity-80 transition-opacity first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{o.description}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{o.contract_name ?? "—"}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={cn("text-xs font-medium tabular-nums", urgent ? "text-risk-critical" : "text-muted-foreground")}>
                    {days === 0 ? "Hoje" : days === 1 ? "Amanhã" : `${days}d`}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{fmtDate(o.due_date)}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </SojCard>
  );
}
