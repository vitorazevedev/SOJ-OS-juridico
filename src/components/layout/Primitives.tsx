import { cn } from "@/lib/utils";
import { ReactNode } from "react";

export function SojCard({ children, className, padding = true }: { children: ReactNode; className?: string; padding?: boolean }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card", padding && "p-5", className)}>
      {children}
    </div>
  );
}

export function KPICard({
  label,
  value,
  delta,
  deltaPositive,
  hint,
  valueSize = "md",
}: {
  label: string;
  value: string;
  delta?: string;
  deltaPositive?: boolean;
  hint?: string;
  valueSize?: "sm" | "md";
}) {
  return (
    <SojCard className="flex flex-col gap-1.5 md:gap-2 p-3.5 md:p-5">
      <span className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            "font-semibold tracking-tight",
            valueSize === "sm"
              ? "text-base md:text-2xl"
              : "text-xl md:text-3xl"
          )}
        >
          {value}
        </span>
        {delta && (
          <span className={cn("text-[10px] md:text-xs font-medium", deltaPositive ? "text-primary" : "text-destructive")}>
            {delta}
          </span>
        )}
      </div>
      {hint && <span className="text-[10px] md:text-xs text-muted-foreground">{hint}</span>}
    </SojCard>
  );
}

export function RiskBadge({ score }: { score: number }) {
  const level = score >= 65 ? "critical" : score >= 40 ? "medium" : "low";
  const label = score >= 65 ? "Crítico" : score >= 40 ? "Médio" : "Baixo";
  const cls = {
    critical: "bg-risk-critical-dim text-risk-critical",
    medium: "bg-risk-medium-dim text-risk-medium",
    low: "bg-risk-low-dim text-risk-low",
  }[level];
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium tabular-nums", cls)}>
      <span className="font-semibold">{score}</span>
      <span className="opacity-70">·</span>
      <span>{label}</span>
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Analisado: "bg-primary-dim text-primary",
    "Em análise": "bg-info-dim text-info",
    Pendente: "bg-risk-medium-dim text-risk-medium",
    Assinado: "bg-muted text-muted-foreground",
  };
  return (
    <span className={cn("inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium", map[status] ?? "bg-muted text-muted-foreground")}>
      {status}
    </span>
  );
}

export function SeverityDot({ severity }: { severity: string }) {
  const cls = ({
    critico: "bg-risk-critical",
    alto: "bg-risk-high",
    medio: "bg-risk-medium",
    baixo: "bg-risk-low",
  } as Record<string, string>)[severity];
  return <span className={cn("inline-block h-2 w-2 rounded-full shrink-0", cls)} />;
}
