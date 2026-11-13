import { SojCard, cn } from "@ponderum/ui";
import { fmtDate, type WaitlistEntry } from "@/lib/adminDashboard";

export function WaitlistTable({ waitlist }: { waitlist: WaitlistEntry[] }) {
  return (
    <SojCard className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Acesso antecipado — waitlist</h2>
        <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {waitlist.length} solicitação{waitlist.length !== 1 ? "ões" : ""}
        </span>
      </div>
      {waitlist.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">Nenhuma solicitação ainda.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                {["Nome", "Email", "WhatsApp", "Perfil", "Contratos/mês", "Origem", "Data"].map((h, i) => (
                  <th key={h} className={cn("pb-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground", i >= 5 && "text-right")}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {waitlist.map((w) => {
                const origin = [w.source, w.utm_medium, w.utm_campaign].filter(Boolean).join(" · ");
                return (
                  <tr key={w.id}>
                    <td className="py-2.5 font-medium text-sm">{w.name}</td>
                    <td className="py-2.5 text-xs text-muted-foreground">{w.email}</td>
                    <td className="py-2.5 text-xs text-muted-foreground">{w.phone ?? "—"}</td>
                    <td className="py-2.5 text-xs text-muted-foreground">{w.role ?? "—"}</td>
                    <td className="py-2.5 text-xs text-muted-foreground">{w.contracts_per_month ?? "—"}</td>
                    <td className="py-2.5 text-right text-xs text-muted-foreground">{origin || "—"}</td>
                    <td className="py-2.5 text-right text-xs text-muted-foreground">{fmtDate(w.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SojCard>
  );
}
