import { SojCard } from "@/components/layout/Primitives";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtDate, STATUS_LABEL, type Contract } from "@/lib/adminDashboard";

export function RecentActivityFeed({ recentContracts }: { recentContracts: Contract[] }) {
  return (
    <SojCard className="flex flex-col gap-3">
      <h2 className="text-sm font-medium">Atividade recente</h2>
      {recentContracts.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">Nenhum contrato ainda.</p>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {recentContracts.map((c) => (
            <div key={c.id} className="flex items-center gap-3 py-2.5">
              <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs truncate">{c.name}</p>
                <p className="text-[10px] text-muted-foreground">{c.org_name}</p>
              </div>
              <span className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0",
                c.status === "analisado" ? "bg-primary-dim text-primary"
                  : c.status === "em_analise" ? "bg-info/10 text-info"
                  : "bg-muted text-muted-foreground"
              )}>
                {STATUS_LABEL[c.status] ?? c.status}
              </span>
              <span className="text-[10px] text-muted-foreground shrink-0">{fmtDate(c.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </SojCard>
  );
}
