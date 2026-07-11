import { cn } from "@/lib/utils";

type FilterStatus = "todos" | "pendente" | "cumprida" | "atrasada";

export function ObligationsFilters({
  statusFilter,
  setStatusFilter,
  onlyUrgent,
  setOnlyUrgent,
  typeOptions,
  typeFilter,
  setTypeFilter,
  contractOptions,
  contractFilter,
  setContractFilter,
}: {
  statusFilter: FilterStatus;
  setStatusFilter: (s: FilterStatus) => void;
  onlyUrgent: boolean;
  setOnlyUrgent: (fn: (v: boolean) => boolean) => void;
  typeOptions: { type: string; label: string }[];
  typeFilter: string;
  setTypeFilter: (v: string) => void;
  contractOptions: { id: string; name: string }[];
  contractFilter: string;
  setContractFilter: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between">
      <div className="flex gap-2 overflow-x-auto scroll-hide -mx-1 px-1">
        {(["todos", "pendente", "cumprida", "atrasada"] as FilterStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              "shrink-0 rounded-full text-[11px] md:text-xs border px-3 py-1.5 capitalize transition-colors active:opacity-70",
              statusFilter === s
                ? "bg-primary-dim border-primary/50 text-primary font-medium"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
            style={{ minHeight: 32 }}
          >
            {s === "todos" ? "Todos" : s}
          </button>
        ))}
        <button
          onClick={() => setOnlyUrgent((v) => !v)}
          className={cn(
            "shrink-0 rounded-full text-[11px] md:text-xs border px-3 py-1.5 transition-colors active:opacity-70",
            onlyUrgent
              ? "bg-risk-critical-dim border-risk-critical/50 text-risk-critical font-medium"
              : "border-border text-muted-foreground hover:text-foreground"
          )}
          style={{ minHeight: 32 }}
        >
          ⚡ Vencendo em 7d
        </button>
      </div>
      <div className="flex gap-2">
        {typeOptions.length > 0 && (
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs md:text-sm rounded-lg bg-card border border-border px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="todos">Todos os tipos</option>
            {typeOptions.map((t) => (
              <option key={t.type} value={t.type}>
                {t.label}
              </option>
            ))}
          </select>
        )}
        {contractOptions.length > 0 && (
          <select
            value={contractFilter}
            onChange={(e) => setContractFilter(e.target.value)}
            className="text-xs md:text-sm rounded-lg bg-card border border-border px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="todos">Todos os contratos</option>
            {contractOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
