import { SojCard } from "@/components/layout/Primitives";
import { formatBRL } from "@/lib/obligationsFormat";

export function ObligationsStats({
  stats,
}: {
  stats: { urgent: number; pending: number; done: number; totalValue: number };
}) {
  return (
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
  );
}
