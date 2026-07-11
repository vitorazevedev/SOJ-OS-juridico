import { useMemo, useState } from "react";
import { SojCard } from "@/components/layout/Primitives";
import { Calendar, Plus } from "lucide-react";
import { useObligations } from "@/hooks/useObligations";
import { Skeleton } from "@/components/ui/skeleton";
import { NewObligationModal } from "@/components/obligations/NewObligationModal";
import { ObligationRow } from "@/components/obligations/ObligationRow";
import { ObligationsEmptyState } from "@/components/obligations/ObligationsEmptyState";
import { ObligationsStats } from "@/components/obligations/ObligationsStats";
import { ObligationsFilters } from "@/components/obligations/ObligationsFilters";
import { daysUntil, obligationTypeLabel } from "@/lib/obligationsFormat";

type FilterStatus = "todos" | "pendente" | "cumprida" | "atrasada";

export default function Obligations() {
  const { obligations, loading } = useObligations();
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("todos");
  const [onlyUrgent, setOnlyUrgent] = useState(false);
  const [contractFilter, setContractFilter] = useState<string>("todos");
  const [typeFilter, setTypeFilter] = useState<string>("todos");
  const [showModal, setShowModal] = useState(false);

  const contractOptions = useMemo(() => {
    const map = new Map<string, string>();
    obligations.forEach((o) => {
      if (o.contract) map.set(o.contract.id, o.contract.name);
    });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [obligations]);

  const typeOptions = useMemo(() => {
    const set = new Set<string>();
    obligations.forEach((o) => { if (o.obligation_type) set.add(o.obligation_type); });
    return Array.from(set, (type) => ({ type, label: obligationTypeLabel(type) ?? type }));
  }, [obligations]);

  const filtered = useMemo(() => {
    return obligations.filter((o) => {
      if (statusFilter !== "todos" && o.status !== statusFilter) return false;
      if (contractFilter !== "todos" && o.contract_id !== contractFilter) return false;
      if (typeFilter !== "todos" && o.obligation_type !== typeFilter) return false;
      if (onlyUrgent) {
        const d = daysUntil(o.due_date);
        if (d === null || d < 0 || d > 7) return false;
        if (o.status === "cumprida") return false;
      }
      return true;
    });
  }, [obligations, statusFilter, contractFilter, typeFilter, onlyUrgent]);

  const stats = useMemo(() => {
    let urgent = 0;
    let pending = 0;
    let done = 0;
    let totalValue = 0;
    obligations.forEach((o) => {
      const d = daysUntil(o.due_date);
      if (o.status === "cumprida") done++;
      else pending++;
      if (o.status !== "cumprida" && d !== null && d >= 0 && d <= 7) urgent++;
      if (o.status !== "cumprida" && o.value_cents) totalValue += o.value_cents;
    });
    return { urgent, pending, done, totalValue };
  }, [obligations]);

  return (
    <div className="flex flex-col gap-4 md:gap-6 max-w-[1400px] mx-auto animate-fade-in">
      <NewObligationModal open={showModal} onClose={() => setShowModal(false)} />

      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg md:text-2xl font-semibold tracking-tight">Obrigações</h1>
          <p className="hidden md:block text-sm text-muted-foreground mt-1">
            Acompanhe prazos e entregas dos contratos ativos · em tempo real
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 h-9 md:h-10 px-3 md:px-4 rounded-lg bg-primary text-black text-xs md:text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nova Obrigação</span>
        </button>
      </div>

      <ObligationsStats stats={stats} />

      <ObligationsFilters
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        onlyUrgent={onlyUrgent}
        setOnlyUrgent={setOnlyUrgent}
        typeOptions={typeOptions}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        contractOptions={contractOptions}
        contractFilter={contractFilter}
        setContractFilter={setContractFilter}
      />

      <SojCard padding={false}>
        <div className="px-4 md:px-5 py-3.5 md:py-4 border-b border-border flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium text-sm md:text-base">Agenda de Obrigações</h3>
          <span className="ml-auto text-xs text-muted-foreground tabular-nums">{filtered.length}</span>
        </div>

        {loading ? (
          <div className="p-4 space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <ObligationsEmptyState hasAny={obligations.length > 0} />
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((o) => (
              <ObligationRow key={o.id} o={o} />
            ))}
          </div>
        )}
      </SojCard>
    </div>
  );
}
