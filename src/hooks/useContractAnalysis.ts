import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export type ParsedData = {
  parties: string[];
  signing_date: string | null;
  start_date: string | null;
  end_date: string | null;
  term_description: string | null;
  contract_value_brl: number | null;
  penalty_description: string | null;
  key_clauses: string[];
};

export type FullContract = {
  id: string;
  name: string;
  party: string | null;
  type: string | null;
  status: string;
  file_name: string | null;
  file_size: number | null;
  file_type: string | null;
  page_count: number | null;
  created_at: string;
  updated_at: string | null;
  contract_value_informed: number | null;
  parsed_data: ParsedData | null;
};

export type ContractContent = {
  raw_text: string;
  word_count: number | null;
  ocr_applied: boolean;
  parsed_at: string;
};

export type ContractAnalysis = {
  id: string;
  risk_score: number | null;
  status: string;
  summary: string | null;
  financial_total: number | null;
  analyzed_at: string | null;
};

export type ClauseRisk = {
  id: string;
  title: string;
  severity: string;
  category: string | null;
  original_text: string | null;
  suggestion: string | null;
  exposure_likely: number | null;
  exposure_min: number | null;
  exposure_max: number | null;
  sort_order: number;
};

export function useContractAnalysis(contractId: string | undefined) {
  const [contract, setContract] = useState<FullContract | null>(null);
  const [content, setContent] = useState<ContractContent | null>(null);
  const [analysis, setAnalysis] = useState<ContractAnalysis | null>(null);
  const [clauses, setClauses] = useState<ClauseRisk[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!contractId) { setLoading(false); return; }
    setLoading(true);
    const [contractRes, contentRes, analysisRes] = await Promise.all([
      supabase
        .from("contracts")
        .select("id,name,party,type,status,file_name,file_size,file_type,page_count,created_at,updated_at,contract_value_informed,parsed_data")
        .eq("id", contractId)
        .maybeSingle(),
      supabase
        .from("contract_contents")
        .select("raw_text,word_count,ocr_applied,parsed_at")
        .eq("contract_id", contractId)
        .maybeSingle(),
      supabase
        .from("contract_analyses")
        .select("id,risk_score,status,summary,financial_total,analyzed_at")
        .eq("contract_id", contractId)
        .maybeSingle(),
    ]);

    if (!contractRes.data) { setNotFound(true); setLoading(false); return; }
    setContract(contractRes.data as FullContract);
    setContent((contentRes.data as ContractContent | null) ?? null);
    const anal = (analysisRes.data as ContractAnalysis | null) ?? null;
    setAnalysis(anal);

    if (anal?.id) {
      const { data: clauseData } = await supabase
        .from("clause_risks")
        .select("id,title,severity,category,original_text,suggestion,exposure_likely,exposure_min,exposure_max,sort_order")
        .eq("analysis_id", anal.id)
        .order("sort_order", { ascending: true });
      setClauses((clauseData ?? []) as ClauseRisk[]);
    } else {
      setClauses([]);
    }
    setLoading(false);
  }, [contractId]);

  useEffect(() => {
    fetchAll();
    if (!contractId) return;
    const ch = supabase
      .channel(`contract-analysis-${contractId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "contracts", filter: `id=eq.${contractId}` }, fetchAll)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [contractId, fetchAll]);

  const triggerAnalysis = useCallback(async (): Promise<{ error?: string }> => {
    if (!contractId) return { error: 'No contract ID' };
    const { error } = await supabase.functions.invoke('analyze-contract', {
      body: { contract_id: contractId },
    });
    if (error) {
      // FunctionsHttpError.message is a generic "non-2xx status code" string —
      // the actual error is in the response body, reachable via error.context.
      let message = error.message ?? String(error);
      const context = (error as { context?: Response }).context;
      if (context && typeof context.json === 'function') {
        try {
          const body = await context.json();
          if (body?.error) message = body.error;
        } catch {
          // response body wasn't JSON — keep the generic message
        }
      }
      return { error: message };
    }
    await fetchAll();
    return {};
  }, [contractId, fetchAll]);

  const saveContractValue = useCallback(async (valueBRL: number): Promise<void> => {
    if (!contractId) return;
    await supabase
      .from("contracts")
      .update({ contract_value_informed: valueBRL })
      .eq("id", contractId);
    await fetchAll();
  }, [contractId, fetchAll]);

  return { contract, content, analysis, clauses, loading, notFound, refetch: fetchAll, triggerAnalysis, saveContractValue };
}
