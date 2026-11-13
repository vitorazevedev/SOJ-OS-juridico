import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type ChartPoint = {
  month: string;
  contracts: number;
  exposure: number;
};

const MONTHS_PT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

export function useVolumeChart(months: number) {
  const [data, setData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      setLoading(true);

      const from = new Date();
      from.setMonth(from.getMonth() - months + 1);
      from.setDate(1);
      from.setHours(0, 0, 0, 0);

      const { data: rows } = await supabase
        .from("contracts")
        .select("created_at, status, contract_analyses(financial_total)")
        .gte("created_at", from.toISOString())
        .order("created_at", { ascending: true });

      if (cancelled) return;

      const buckets = new Map<string, { contracts: number; exposure: number }>();

      for (let i = months - 1; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        buckets.set(key, { contracts: 0, exposure: 0 });
      }

      for (const row of (rows ?? []) as {
        created_at: string;
        status: string;
        contract_analyses: { financial_total: number | null }[] | null;
      }[]) {
        const d = new Date(row.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (!buckets.has(key)) continue;
        const b = buckets.get(key)!;
        if (row.status === "analisado") b.contracts += 1;
        const ft = row.contract_analyses?.[0]?.financial_total;
        if (ft != null) b.exposure += ft / 100;
      }

      const result: ChartPoint[] = Array.from(buckets.entries()).map(([key, val]) => {
        const monthIdx = parseInt(key.split("-")[1]) - 1;
        return { month: MONTHS_PT[monthIdx], contracts: val.contracts, exposure: val.exposure };
      });

      setData(result);
      setLoading(false);
    }

    fetch();
    return () => { cancelled = true; };
  }, [months]);

  return { data, loading };
}
