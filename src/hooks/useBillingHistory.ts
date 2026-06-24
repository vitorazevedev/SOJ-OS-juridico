import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export type BillingRecord = {
  id: string;
  org_id: string;
  billing_date: string;
  description: string;
  amount_cents: number;
  status: string;
  stripe_invoice_id: string | null;
  created_at: string;
};

export function useBillingHistory() {
  const [records, setRecords] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("billing_history")
      .select("*")
      .order("billing_date", { ascending: false });
    setRecords((data as BillingRecord[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { records, loading, refresh: fetch };
}
