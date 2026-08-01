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
  org_id: string | null;
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
  indice_desequilibrio: number | null;
  parte_representada: string | null;
};

export type ReviewStatus = "revisado" | "ajustado" | "descartado" | "mantido_pelo_usuario";

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
  gravidade: number | null;
  ancora_id: string | null;
  onera_parte_representada: boolean | null;
  justificativa_gravidade: string | null;
  confianca: string | null;
  polaridade_parte_representada: number | null;
  score_simetria: number | null;
  score_valor_exposto: number | null;
  score_prazo_reversibilidade: number | null;
  score_foro_execucao: number | null;
  conclusao: string | null;
  impacto_identificado: string[] | null;
  mitigacao: string | null;
  review_status: ReviewStatus | null;
  reviewed_at: string | null;
  ancoras: { gravidade_referencia: number | null; titulo: string | null } | null;
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
        .select("id,name,party,type,status,file_name,file_size,file_type,page_count,created_at,updated_at,contract_value_informed,parsed_data,org_id")
        .eq("id", contractId)
        .maybeSingle(),
      supabase
        .from("contract_contents")
        .select("raw_text,word_count,ocr_applied,parsed_at")
        .eq("contract_id", contractId)
        .maybeSingle(),
      supabase
        .from("contract_analyses_gated")
        .select("id,risk_score,status,summary,financial_total,analyzed_at,indice_desequilibrio,parte_representada")
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
        .select("id,title,severity,category,original_text,suggestion,exposure_likely,exposure_min,exposure_max,sort_order,gravidade,ancora_id,onera_parte_representada,justificativa_gravidade,confianca,polaridade_parte_representada,score_simetria,score_valor_exposto,score_prazo_reversibilidade,score_foro_execucao,conclusao,impacto_identificado,mitigacao,review_status,reviewed_at,ancoras(gravidade_referencia,titulo)")
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

  // Falhas de infraestrutura (worker sem recurso, idle timeout, gateway fora do
  // ar) são transitórias e intermitentes — retry costuma resolver sem custo
  // extra real, já que a maioria falha antes de sequer chamar a Anthropic.
  // Erros de negócio (rate limit, contrato sem texto extraído, etc.) vêm com
  // status 4xx e não devem ser retried — tentar de novo não muda o resultado.
  const ANALYSIS_MAX_ATTEMPTS = 3; // 1 tentativa original + 2 retries

  const triggerAnalysis = useCallback(async (parteRepresentada?: string): Promise<{ error?: string }> => {
    if (!contractId) return { error: 'No contract ID' };
    let lastMessage = 'Erro desconhecido';

    for (let attempt = 1; attempt <= ANALYSIS_MAX_ATTEMPTS; attempt++) {
      const { error } = await supabase.functions.invoke('analyze-contract', {
        body: { contract_id: contractId, ...(parteRepresentada ? { parte_representada: parteRepresentada } : {}) },
      });

      if (!error) {
        await fetchAll();
        return {};
      }

      // FunctionsHttpError.message é um texto genérico "non-2xx status code" —
      // o erro de verdade está no corpo da resposta, acessível via error.context.
      let message = error.message ?? String(error);
      const context = (error as { context?: Response }).context;
      if (context && typeof context.json === 'function') {
        try {
          const body = await context.json();
          if (body?.error) message = body.error;
        } catch {
          // corpo da resposta não era JSON — mantém a mensagem genérica
        }
      }
      lastMessage = message;

      // Sem context = a requisição nem chegou a ter resposta (timeout/rede) —
      // também é falha de infra. Status 5xx explícito idem. Qualquer outra
      // coisa (4xx) é erro de negócio, não retry.
      const isInfraFailure = !context || context.status >= 500;
      if (!isInfraFailure || attempt === ANALYSIS_MAX_ATTEMPTS) {
        return { error: message };
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
    }
    return { error: lastMessage };
  }, [contractId, fetchAll]);

  const updateClauseReview = useCallback(async (clauseId: string, status: ReviewStatus): Promise<void> => {
    await supabase
      .from("clause_risks")
      .update({ review_status: status, reviewed_at: new Date().toISOString() })
      .eq("id", clauseId);
    await fetchAll();
  }, [fetchAll]);

  const updateClauseSuggestion = useCallback(async (clauseId: string, suggestion: string): Promise<void> => {
    await supabase
      .from("clause_risks")
      .update({ suggestion })
      .eq("id", clauseId);
    await fetchAll();
  }, [fetchAll]);

  const saveContractValue = useCallback(async (valueBRL: number): Promise<void> => {
    if (!contractId) return;
    await supabase
      .from("contracts")
      .update({ contract_value_informed: valueBRL })
      .eq("id", contractId);
    await fetchAll();
  }, [contractId, fetchAll]);

  return { contract, content, analysis, clauses, loading, notFound, refetch: fetchAll, triggerAnalysis, saveContractValue, updateClauseReview, updateClauseSuggestion };
}
