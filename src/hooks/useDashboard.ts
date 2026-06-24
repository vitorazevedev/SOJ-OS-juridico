import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export type DashboardSummary = {
  total_contracts: number;
  avg_risk_score: number;
  total_exposure_cents: number;
  pending_obligations: number;
  urgent_obligations: number;
};

export type RecentContract = {
  id: string;
  name: string;
  party: string | null;
  type: string | null;
  status: string;
  created_at: string;
  risk_score: number | null;
  financial_total: number | null;
};

export type UpcomingObligation = {
  id: string;
  description: string;
  due_date: string;
  status: string;
  contract_name: string | null;
};

const EMPTY: DashboardSummary = {
  total_contracts: 0,
  avg_risk_score: 0,
  total_exposure_cents: 0,
  pending_obligations: 0,
  urgent_obligations: 0,
};

export function useDashboard() {
  const [summary, setSummary] = useState<DashboardSummary>(EMPTY);
  const [recentContracts, setRecentContracts] = useState<RecentContract[]>([]);
  const [topRisks, setTopRisks] = useState<RecentContract[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingObligation[]>([]);
  const [byStatus, setByStatus] = useState<{ status: string; count: number }[]>([]);
  const [byType, setByType] = useState<{ type: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);

    const today = new Date().toISOString().split("T")[0];
    const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const [sumRes, contractsRes, allContractsRes, obligationsRes] = await Promise.all([
      supabase.from("dashboard_summary").select("*").maybeSingle(),
      supabase
        .from("contracts")
        .select("id,name,party,type,status,created_at,contract_analyses(risk_score,financial_total)")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase.from("contracts").select("status,type"),
      supabase
        .from("contract_obligations")
        .select("id,description,due_date,status,contracts(name)")
        .eq("status", "pendente")
        .gte("due_date", today)
        .lte("due_date", in30)
        .order("due_date", { ascending: true })
        .limit(5),
    ]);

    setSummary((sumRes.data as DashboardSummary | null) ?? EMPTY);

    type RawContract = {
      id: string; name: string; party: string | null; type: string | null;
      status: string; created_at: string;
      contract_analyses: { risk_score: number | null; financial_total: number | null }[] | null;
    };
    const rows: RecentContract[] = ((contractsRes.data ?? []) as RawContract[]).map((c) => ({
      id: c.id,
      name: c.name,
      party: c.party,
      type: c.type,
      status: c.status,
      created_at: c.created_at,
      risk_score: c.contract_analyses?.[0]?.risk_score ?? null,
      financial_total: c.contract_analyses?.[0]?.financial_total ?? null,
    }));

    // byStatus and byType for charts (all contracts, no limit)
    const statusMap = new Map<string, number>();
    const typeMap = new Map<string, number>();
    ((allContractsRes.data ?? []) as { status: string; type: string | null }[]).forEach((c) => {
      const s = c.status ?? "aguardando";
      statusMap.set(s, (statusMap.get(s) ?? 0) + 1);
      const t = c.type ?? "Outros";
      typeMap.set(t, (typeMap.get(t) ?? 0) + 1);
    });
    setByStatus(Array.from(statusMap, ([status, count]) => ({ status, count })));
    setByType(Array.from(typeMap, ([type, count]) => ({ type, count })));

    setRecentContracts(rows.slice(0, 6));
    setTopRisks(
      [...rows]
        .filter((c) => c.risk_score != null)
        .sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0))
        .slice(0, 5),
    );

    type RawObligation = {
      id: string; description: string; due_date: string; status: string;
      contracts: { name: string } | null;
    };
    setUpcoming(
      ((obligationsRes.data ?? []) as RawObligation[]).map((o) => ({
        id: o.id,
        description: o.description,
        due_date: o.due_date,
        status: o.status,
        contract_name: o.contracts?.name ?? null,
      })),
    );

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel("dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "contracts" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "contract_obligations" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "contract_analyses" }, fetchAll)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchAll]);

  return { summary, recentContracts, topRisks, upcoming, byStatus, byType, loading, refetch: fetchAll };
}
