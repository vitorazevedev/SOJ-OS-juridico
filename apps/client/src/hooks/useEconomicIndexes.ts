import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type EconomicIndexes = {
  selic: number;
  ipca_12m: number;
  inpc_12m: number;
  igpm_12m: number;
  fetched_at: string | null;
};

const DEFAULTS: EconomicIndexes = {
  selic: 14.75,
  ipca_12m: 4.83,
  inpc_12m: 4.21,
  igpm_12m: 6.10,
  fetched_at: null,
};

export function useEconomicIndexes() {
  const [indexes, setIndexes] = useState<EconomicIndexes>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from("economic_indexes")
        .select("name,value,fetched_at");

      if (data && data.length > 0) {
        const map: Partial<EconomicIndexes> = {};
        let fetchedAt: string | null = null;
        for (const row of data as { name: string; value: number; fetched_at: string }[]) {
          if (row.name === "selic") map.selic = row.value;
          if (row.name === "ipca_12m") map.ipca_12m = row.value;
          if (row.name === "inpc_12m") map.inpc_12m = row.value;
          if (row.name === "igpm_12m") map.igpm_12m = row.value;
          if (!fetchedAt || row.fetched_at > fetchedAt) fetchedAt = row.fetched_at;
        }
        setIndexes({ ...DEFAULTS, ...map, fetched_at: fetchedAt });
      }
      setLoading(false);
    }
    fetch();
  }, []);

  return { indexes, loading };
}
