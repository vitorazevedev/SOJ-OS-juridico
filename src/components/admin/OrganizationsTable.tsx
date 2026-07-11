import { SojCard } from "@/components/layout/Primitives";
import { cn } from "@/lib/utils";
import { fmtDate, PLAN_LABEL, type Org } from "@/lib/adminDashboard";

export function OrganizationsTable({ orgs }: { orgs: Org[] }) {
  return (
    <SojCard className="flex flex-col gap-3">
      <h2 className="text-sm font-medium">Organizações</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              {["Nome", "Plano", "Contratos", "Análises", "Criada em"].map((h, i) => (
                <th key={h} className={cn("pb-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground", i > 1 && "text-right")}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orgs.map((org) => (
              <tr key={org.id}>
                <td className="py-2.5 font-medium">{org.name}</td>
                <td className="py-2.5">
                  <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium",
                    org.plan_id === "pro" ? "bg-primary-dim text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    {PLAN_LABEL[org.plan_id] ?? org.plan_id}
                  </span>
                </td>
                <td className="py-2.5 text-right tabular-nums text-muted-foreground">{org.contract_count}</td>
                <td className="py-2.5 text-right tabular-nums text-muted-foreground">{org.analysis_count}</td>
                <td className="py-2.5 text-right text-muted-foreground text-xs">{fmtDate(org.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SojCard>
  );
}
