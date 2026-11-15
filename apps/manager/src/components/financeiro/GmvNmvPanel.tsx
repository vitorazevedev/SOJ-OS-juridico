import { useEffect, useState } from "react";
import { SojCard, Button } from "@ponderum/ui";
import { Loader2, Download, TrendingDown, TrendingUp } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fmtBRL } from "@/lib/adminDashboard";
import { downloadBlob } from "@/lib/downloadBlob";

// Modulo de Cupom de Desconto, Etapa C (docs/CUPOM_SPEC.md, secao 7.1).
// Numeros vem de get_finance_metrics() -- regras de calculo centralizadas
// la (_finance_waterfall), nao aqui, exatamente para poder ajustar a
// formula depois sem mexer na tela. Varios pontos da secao 7.1 ainda estao
// pendentes de validacao com o financeiro (regime caixa vs competencia,
// cortesia, impostos) -- por isso o rotulo "definicao provisoria".

type Waterfall = {
  gmv_cents: number;
  coupon_discount_cents: number;
  refunds_cents: number;
  chargebacks_lost_cents: number;
  fees_cents: number;
  nmv_cents: number;
  net_cash_cents: number;
};

type EvolutionRow = { month: string; gmv_cents: number; nmv_cents: number };
type PlanBreakdown = { plan_code: string; revenue_cents: number; discount_cents: number };
type MethodBreakdown = { method: string; revenue_cents: number; discount_cents: number };
type CouponBreakdown = { coupon_code: string; discount_cents: number; nmv_generated_cents: number };

type FinanceMetrics = {
  month: string;
  current: Waterfall;
  previous: Waterfall;
  evolution_12m: EvolutionRow[];
  by_plan: PlanBreakdown[];
  by_method: MethodBreakdown[];
  by_coupon: CouponBreakdown[];
};

function fmtMonth(ym: string) {
  const [y, m] = ym.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function Delta({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return null;
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const Icon = pct >= 0 ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] ${pct >= 0 ? "text-primary" : "text-risk-high"}`}>
      <Icon className="h-3 w-3" />
      {pct >= 0 ? "+" : ""}{pct.toFixed(1)}%
    </span>
  );
}

const WATERFALL_ROWS: { key: keyof Waterfall; label: string; sign: "+" | "−" | "=" }[] = [
  { key: "gmv_cents", label: "GMV", sign: "+" },
  { key: "coupon_discount_cents", label: "Descontos de cupom", sign: "−" },
  { key: "refunds_cents", label: "Estornos", sign: "−" },
  { key: "chargebacks_lost_cents", label: "Chargebacks", sign: "−" },
  { key: "nmv_cents", label: "NMV", sign: "=" },
  { key: "fees_cents", label: "Taxas do gateway", sign: "−" },
  { key: "net_cash_cents", label: "Receita líquida em caixa", sign: "=" },
];

export function GmvNmvPanel() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [metrics, setMetrics] = useState<FinanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    supabase
      .rpc("get_finance_metrics", { p_month: `${month}-01` })
      .then(({ data }) => {
        setMetrics(data as FinanceMetrics | null);
        setLoading(false);
      });
  }, [month]);

  const exportCsv = () => {
    if (!metrics) return;
    const rows = [
      ["Indicador", fmtMonth(metrics.month)],
      ...WATERFALL_ROWS.map((r) => [r.label, (metrics.current[r.key] / 100).toFixed(2)]),
      [],
      ["Evolução 12 meses"],
      ["Mês", "GMV", "NMV"],
      ...metrics.evolution_12m.map((r) => [r.month, (r.gmv_cents / 100).toFixed(2), (r.nmv_cents / 100).toFixed(2)]),
    ];
    const lines = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    downloadBlob(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }), `gmv-nmv-${metrics.month}.csv`);
  };

  return (
    <SojCard className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-medium">GMV e NMV</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Definição provisória — regras de cálculo ainda sujeitas a validação com o financeiro.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-2.5 text-sm"
          />
          <Button variant="outline" size="sm" disabled={!metrics} onClick={exportCsv}>
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
        </div>
      </div>

      {loading || !metrics ? (
        <div className="flex items-center justify-center min-h-[20vh]">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <ul className="flex flex-col divide-y divide-border">
            {WATERFALL_ROWS.map((r) => (
              <li key={r.key} className="flex items-center justify-between py-2 text-sm">
                <span className={r.sign === "=" ? "font-medium" : "text-muted-foreground"}>
                  {r.sign !== "=" && <span className="font-mono text-xs mr-1.5">{r.sign}</span>}
                  {r.label}
                </span>
                <span className="flex items-center gap-2 tabular-nums">
                  <Delta current={metrics.current[r.key]} previous={metrics.previous[r.key]} />
                  <span className={r.sign === "=" ? "font-semibold" : ""}>{fmtBRL(metrics.current[r.key] / 100)}</span>
                </span>
              </li>
            ))}
          </ul>

          <div>
            <h3 className="text-xs font-medium text-muted-foreground mb-2">Evolução (12 meses)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] text-muted-foreground text-left">
                    <th className="pb-1.5 pr-3 font-normal">Mês</th>
                    <th className="pb-1.5 pr-3 font-normal text-right">GMV</th>
                    <th className="pb-1.5 font-normal text-right">NMV</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {metrics.evolution_12m.map((r) => (
                    <tr key={r.month}>
                      <td className="py-1.5 pr-3 font-mono text-xs text-muted-foreground">{r.month}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">{fmtBRL(r.gmv_cents / 100)}</td>
                      <td className="py-1.5 text-right tabular-nums">{fmtBRL(r.nmv_cents / 100)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <h3 className="text-xs font-medium text-muted-foreground mb-2">Por plano</h3>
              <ul className="flex flex-col divide-y divide-border text-sm">
                {metrics.by_plan.map((r) => (
                  <li key={r.plan_code} className="flex items-center justify-between py-1.5">
                    <span className="text-muted-foreground">{r.plan_code}</span>
                    <span className="tabular-nums">{fmtBRL(r.revenue_cents / 100)}</span>
                  </li>
                ))}
                {metrics.by_plan.length === 0 && <li className="py-1.5 text-muted-foreground text-xs">Sem dados no mês.</li>}
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-medium text-muted-foreground mb-2">Por método</h3>
              <ul className="flex flex-col divide-y divide-border text-sm">
                {metrics.by_method.map((r) => (
                  <li key={r.method} className="flex items-center justify-between py-1.5">
                    <span className="text-muted-foreground">{r.method === "card" ? "Cartão" : "Pix"}</span>
                    <span className="tabular-nums">{fmtBRL(r.revenue_cents / 100)}</span>
                  </li>
                ))}
                {metrics.by_method.length === 0 && <li className="py-1.5 text-muted-foreground text-xs">Sem dados no mês.</li>}
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-medium text-muted-foreground mb-2">Por cupom</h3>
              <ul className="flex flex-col divide-y divide-border text-sm">
                {metrics.by_coupon.map((r) => (
                  <li key={r.coupon_code} className="flex items-center justify-between py-1.5">
                    <span className="text-muted-foreground">{r.coupon_code}</span>
                    <span className="tabular-nums">−{fmtBRL(r.discount_cents / 100)}</span>
                  </li>
                ))}
                {metrics.by_coupon.length === 0 && <li className="py-1.5 text-muted-foreground text-xs">Nenhum cupom usado no mês.</li>}
              </ul>
            </div>
          </div>
        </>
      )}
    </SojCard>
  );
}
