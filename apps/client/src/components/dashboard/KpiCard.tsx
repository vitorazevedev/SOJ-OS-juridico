import { SojCard } from "@/components/layout/Primitives";
import { cn } from "@/lib/utils";

export function KpiCard({
  label, value, hint, highlight,
}: { label: string; value: string; hint: string; highlight?: boolean }) {
  return (
    <SojCard className="p-3.5 md:p-5">
      <p className="text-[10px] md:text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="flex items-baseline gap-2 mt-2">
        <span className={cn("text-xl md:text-3xl font-semibold tracking-tight tabular-nums", highlight && "text-risk-critical")}>
          {value}
        </span>
      </div>
      <p className="text-[10px] md:text-xs text-muted-foreground mt-1.5">{hint}</p>
    </SojCard>
  );
}
