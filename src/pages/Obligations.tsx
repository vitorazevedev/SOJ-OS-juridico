import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SojCard } from "@/components/layout/Primitives";
import {
  Calendar,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  MoreVertical,
  Inbox,
  Plus,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useObligations, updateObligationStatus, deleteObligation, type DbObligation } from "@/hooks/useObligations";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NewObligationModal } from "@/components/obligations/NewObligationModal";

type FilterStatus = "todos" | "pendente" | "cumprida" | "atrasada";

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function urgencyMeta(days: number | null, status: string) {
  if (status === "cumprida")
    return { dot: "bg-primary", chip: "bg-primary-dim text-primary", label: "Cumprida", date: "text-muted-foreground" };
  if (days === null)
    return { dot: "bg-muted-foreground", chip: "bg-muted text-muted-foreground", label: "Sem data", date: "text-muted-foreground" };
  if (days < 0 || status === "atrasada")
    return { dot: "bg-risk-critical", chip: "bg-risk-critical-dim text-risk-critical", label: "Vencida", date: "text-risk-critical" };
  if (days <= 1)
    return { dot: "bg-risk-critical", chip: "bg-risk-critical-dim text-risk-critical", label: days === 0 ? "Hoje" : "Amanhã", date: "text-risk-critical" };
  if (days <= 7)
    return { dot: "bg-risk-medium", chip: "bg-risk-medium-dim text-risk-medium", label: "≤ 7 dias", date: "text-risk-medium" };
  if (days <= 15)
    return { dot: "bg-yellow-500", chip: "bg-yellow-500/10 text-yellow-500", label: "≤ 15 dias", date: "text-yellow-500" };
  if (days <= 30)
    return { dot: "bg-info", chip: "bg-info/10 text-info", label: "≤ 30 dias", date: "text-info" };
  return { dot: "bg-primary", chip: "bg-primary-dim text-primary", label: "No prazo", date: "text-primary" };
}

function formatBRL(cents: number | null) {
  if (cents == null) return null;
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(d: string | null) {
  if (!d) return "Sem data";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function responsibleLabel(r: string | null) {
  if (!r) return "—";
  const map: Record<string, string> = { parte_a: "Parte A", parte_b: "Parte B", ambas: "Ambas" };
  return map[r] ?? r;
}

function obligationTypeLabel(t: string | null) {
  const map: Record<string, string> = {
    pagamento: "Pagamento", entrega: "Entrega", notificacao: "Notificação",
    renovacao: "Renovação", reajuste: "Reajuste", outro: "Outro",
  };
  return t ? (map[t] ?? t) : null;
}

export default function Obligations() {
  const navigate = useNavigate();
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-4">
        <SojCard>
          <p className="text-[10px] md:text-xs uppercase tracking-wider text-muted-foreground">Urgentes (≤7d)</p>
          <p className="text-2xl md:text-3xl font-semibold tabular-nums mt-2 text-risk-critical">{stats.urgent}</p>
          <p className="text-[10px] md:text-xs mt-1.5 text-muted-foreground">Ação imediata</p>
        </SojCard>
        <SojCard>
          <p className="text-[10px] md:text-xs uppercase tracking-wider text-muted-foreground">Pendentes</p>
          <p className="text-2xl md:text-3xl font-semibold tabular-nums mt-2">{stats.pending}</p>
          <p className="text-[10px] md:text-xs mt-1.5 text-muted-foreground">Não cumpridas</p>
        </SojCard>
        <SojCard>
          <p className="text-[10px] md:text-xs uppercase tracking-wider text-muted-foreground">Cumpridas</p>
          <p className="text-2xl md:text-3xl font-semibold tabular-nums mt-2 text-primary">{stats.done}</p>
          <p className="text-[10px] md:text-xs mt-1.5 text-muted-foreground">Concluídas</p>
        </SojCard>
        <SojCard>
          <p className="text-[10px] md:text-xs uppercase tracking-wider text-muted-foreground">Valor pendente</p>
          <p className="text-xl md:text-2xl font-semibold tabular-nums mt-2">
            {formatBRL(stats.totalValue) ?? "—"}
          </p>
          <p className="text-[10px] md:text-xs mt-1.5 text-muted-foreground">Soma das ativas</p>
        </SojCard>
      </div>

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
          <EmptyState hasAny={obligations.length > 0} />
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((o) => (
              <ObligationRow key={o.id} o={o} navigate={navigate} />
            ))}
          </div>
        )}
      </SojCard>
    </div>
  );
}

function ObligationRow({
  o,
  navigate,
}: {
  o: DbObligation;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const days = daysUntil(o.due_date);
  const meta = urgencyMeta(days, o.status);
  const value = formatBRL(o.value_cents);

  return (
    <div
      className="px-4 md:px-5 py-3 md:py-4 flex items-center gap-3 md:gap-4 hover:bg-muted/30 active:bg-muted/30 transition-colors"
      style={{ minHeight: 44 }}
    >
      <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", meta.dot)} />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] md:text-sm font-medium truncate">{o.description}</p>
        <p className="text-[10px] md:text-xs text-muted-foreground truncate">
          {o.contract?.name ?? "Contrato removido"} · {responsibleLabel(o.responsible)}
          {obligationTypeLabel(o.obligation_type) && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[9px] md:text-[10px] font-medium">
              {obligationTypeLabel(o.obligation_type)}
            </span>
          )}
        </p>
      </div>

      {value && (
        <span className="text-[11px] md:text-sm tabular-nums font-medium hidden sm:inline">{value}</span>
      )}

      <div className="flex flex-col md:flex-row items-end md:items-center gap-1 md:gap-2 shrink-0">
        <span className={cn("text-[10px] md:text-xs tabular-nums font-medium", meta.date)}>
          {formatDate(o.due_date)}
        </span>
        <span className={cn("text-[10px] md:text-[11px] px-2 py-0.5 md:py-1 rounded-md font-medium", meta.chip)}>
          {meta.label}
        </span>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted active:opacity-70 shrink-0"
            aria-label="Ações"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {o.status !== "cumprida" && (
            <DropdownMenuItem onClick={() => updateObligationStatus(o.id, "cumprida")}>
              <CheckCircle2 className="h-4 w-4 mr-2 text-primary" />
              Marcar como cumprida
            </DropdownMenuItem>
          )}
          {o.status !== "atrasada" && (
            <DropdownMenuItem onClick={() => updateObligationStatus(o.id, "atrasada")}>
              <AlertCircle className="h-4 w-4 mr-2 text-risk-critical" />
              Marcar como atrasada
            </DropdownMenuItem>
          )}
          {o.status !== "pendente" && (
            <DropdownMenuItem onClick={() => updateObligationStatus(o.id, "pendente")}>
              Reabrir como pendente
            </DropdownMenuItem>
          )}
          {o.contract_id && (
            <DropdownMenuItem onClick={() => navigate(`/analysis/${o.contract_id}`)}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Ver contrato
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-risk-critical focus:text-risk-critical"
            onClick={() => deleteObligation(o.id)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function EmptyState({ hasAny }: { hasAny: boolean }) {
  return (
    <div className="px-4 py-12 md:py-16 text-center">
      <div className="mx-auto h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
        <Inbox className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">
        {hasAny ? "Nenhuma obrigação com esses filtros" : "Nenhuma obrigação ainda"}
      </p>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
        {hasAny
          ? "Ajuste os filtros para ver mais resultados."
          : "Obrigações são extraídas automaticamente das análises de contratos."}
      </p>
    </div>
  );
}
