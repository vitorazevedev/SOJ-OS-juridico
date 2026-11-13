import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

export type UrgentObligation = {
  id: string;
  description: string;
  due_date: string;
  contract_name: string | null;
  days_remaining: number;
};

type UrgentCtx = { obligations: UrgentObligation[]; count: number };

export const UrgentObligationsContext = createContext<UrgentCtx>({ obligations: [], count: 0 });

export function useUrgentObligations() {
  return useContext(UrgentObligationsContext);
}

export function useUrgentObligationsProvider(): UrgentCtx {
  const [obligations, setObligations] = useState<UrgentObligation[]>([]);
  const instanceId = useRef(`urgent-${Math.random().toString(36).slice(2)}`);

  const fetchData = useCallback(async () => {
    const today = new Date().toISOString().split("T")[0];
    const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const { data } = await supabase
      .from("contract_obligations")
      .select("id,description,due_date,contracts(name)")
      .eq("status", "pendente")
      .gte("due_date", today)
      .lte("due_date", in30)
      .order("due_date", { ascending: true })
      .limit(20);

    const todayMs = new Date().setHours(0, 0, 0, 0);
    setObligations(
      ((data ?? []) as {
        id: string;
        description: string;
        due_date: string;
        contracts: { name: string } | null;
      }[]).map((o) => {
        const days = Math.ceil((new Date(o.due_date).getTime() - todayMs) / (1000 * 60 * 60 * 24));
        return {
          id: o.id,
          description: o.description,
          due_date: o.due_date,
          contract_name: o.contracts?.name ?? null,
          days_remaining: days,
        };
      })
    );
  }, []);

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel(instanceId.current)
      .on("postgres_changes", { event: "*", schema: "public", table: "contract_obligations" }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  // badge count: only truly urgent (≤7 days)
  const urgentCount = obligations.filter((o) => o.days_remaining <= 7).length;

  return { obligations, count: urgentCount };
}
