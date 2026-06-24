import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Loader2 } from "lucide-react";
import { useVolumeChart } from "@/hooks/useVolumeChart";
import { cn } from "@/lib/utils";

const PERIODS = [
  { label: "3M", value: 3 },
  { label: "6M", value: 6 },
  { label: "12M", value: 12 },
] as const;

function fmtExposure(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${Math.round(v / 1_000)}K`;
  if (v === 0) return "—";
  return `R$ ${v.toLocaleString("pt-BR")}`;
}

export function VolumeExposureChart() {
  const [period, setPeriod] = useState<3 | 6 | 12>(6);
  const { data, loading } = useVolumeChart(period);

  return (
    <div>
      <div className="flex gap-1 mb-4">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value as 3 | 6 | 12)}
            className={cn(
              "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
              period === p.value
                ? "bg-primary text-background"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[260px]">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={data} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="2 4" vertical={false} />
            <XAxis dataKey="month" stroke="hsl(var(--text-3))" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis
              yAxisId="left"
              stroke="hsl(var(--text-3))"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              width={28}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="hsl(var(--text-3))"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={48}
              tickFormatter={(v: number) =>
                v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${Math.round(v / 1_000)}K` : String(v)
              }
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 500 }}
              formatter={(value: number, name: string) => {
                if (name === "exposure") return [fmtExposure(value), "Exposição financeira"];
                return [value, "Contratos analisados"];
              }}
            />
            <Bar yAxisId="left" dataKey="contracts" name="contracts" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={28} />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="exposure"
              name="exposure"
              stroke="hsl(var(--risk-critical))"
              strokeWidth={2}
              dot={{ r: 3, fill: "hsl(var(--risk-critical))", strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}

      <div className="flex gap-5 justify-center mt-3">
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
          Contratos analisados
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="h-2.5 w-2.5 rounded-full bg-risk-critical" />
          Exposição financeira (R$)
        </span>
      </div>
    </div>
  );
}

export function GaugeChart({ score, compact = false }: { score: number; compact?: boolean }) {
  const pct = Math.min(100, Math.max(0, score));
  const color = pct >= 65 ? "hsl(var(--risk-critical))" : pct >= 40 ? "hsl(var(--risk-medium))" : "hsl(var(--risk-low))";
  const r = 70;
  const c = Math.PI * r;
  const offset = c - (pct / 100) * c;
  const w = compact ? 140 : 180;
  const h = compact ? 80 : 110;

  return (
    <div className="relative flex items-center justify-center" style={{ width: w, height: h }}>
      <svg width={w} height={h} viewBox="0 0 180 110" preserveAspectRatio="xMidYMid meet">
        <path d={`M 20 100 A ${r} ${r} 0 0 1 160 100`} fill="none" stroke="hsl(var(--border))" strokeWidth="14" strokeLinecap="round" />
        <path
          d={`M 20 100 A ${r} ${r} 0 0 1 160 100`}
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
        <span className={compact ? "text-2xl font-semibold tabular-nums" : "text-4xl font-semibold tabular-nums"} style={{ color }}>{score}</span>
        <span className="text-[10px] md:text-xs text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  aguardando: "hsl(var(--muted-foreground))",
  processando: "hsl(var(--risk-medium))",
  em_analise: "hsl(var(--info))",
  analisado: "hsl(var(--primary))",
};

const STATUS_LABELS: Record<string, string> = {
  aguardando: "Aguardando",
  processando: "Processando",
  em_analise: "Em análise",
  analisado: "Analisado",
};

export function StatusDonutChart({ data }: { data: { status: string; count: number }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[220px] text-center">
        <p className="text-sm text-muted-foreground">Nenhum contrato ainda</p>
      </div>
    );
  }
  const chartData = data.map((d) => ({
    name: STATUS_LABELS[d.status] ?? d.status,
    value: d.count,
    color: STATUS_COLORS[d.status] ?? "hsl(var(--muted-foreground))",
  }));
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={chartData}
            innerRadius={55}
            outerRadius={85}
            paddingAngle={2}
            dataKey="value"
            stroke="hsl(var(--background))"
            strokeWidth={2}
          >
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-2xl font-semibold tabular-nums">{total}</span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Contratos</span>
      </div>
      <div className="flex flex-wrap justify-center gap-3 mt-2">
        {chartData.map((d) => (
          <span key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-sm" style={{ background: d.color }} />
            {d.name} <span className="tabular-nums text-foreground">{d.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function TypeBarChart({ data }: { data: { type: string; count: number }[] }) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[220px] text-center">
        <p className="text-sm text-muted-foreground">Sem dados de tipo ainda</p>
      </div>
    );
  }
  const sorted = [...data].sort((a, b) => b.count - a.count);
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={sorted} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey="type" stroke="hsl(var(--text-3))" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke="hsl(var(--text-3))" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
          }}
          cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
        />
        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}
