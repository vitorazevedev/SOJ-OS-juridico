import { SojCard } from "@/components/layout/Primitives";
import { Activity } from "lucide-react";
import type { DayCount } from "@/lib/adminDashboard";

export function AnalysesChart({ analysesPerDay }: { analysesPerDay: DayCount[] }) {
  const maxCount = Math.max(...analysesPerDay.map((d) => d.count), 1);

  return (
    <SojCard className="flex flex-col gap-4 p-5">
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-medium">Análises — últimos 7 dias</h2>
      </div>
      <div className="flex items-end gap-2 h-24">
        {analysesPerDay.map(({ day, count }) => (
          <div key={day} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[10px] tabular-nums text-muted-foreground">{count > 0 ? count : ""}</span>
            <div
              className="w-full rounded-t-md bg-primary/70 transition-all"
              style={{ height: `${Math.max((count / maxCount) * 80, count > 0 ? 6 : 2)}px` }}
            />
            <span className="text-[10px] text-muted-foreground font-mono">{day}</span>
          </div>
        ))}
      </div>
    </SojCard>
  );
}
