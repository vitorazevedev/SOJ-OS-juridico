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
  analysis_started_at: string | null;
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
  finding_type: "anchored" | "qualitative_unmapped" | "no_finding";
  qualitative_level: "informativo" | "atencao" | "relevante" | null;
  gating_reason: string | null;
};

export function useContractAnalysis(contractId: string | undefined) {
  const [contract, setContract] = useState<FullContract | null>(null);
  const [content, setContent] = useState<ContractContent | null>(null);
  const [analysis, setAnalysis] = useState<ContractAnalysis | null>(null);
  const [clauses, setClauses] = useState<ClauseRisk[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!contractId) { setLoading(false); return; }
    setLoading(true);
    const [contractRes, contentRes, analysisRes] = await Promise.all([
      supabase
        .from("contracts")
        .select("id,name,party,type,status,file_name,file_size,file_type,page_count,created_at,updated_at,contract_value_informed,parsed_data,org_id,analysis_started_at")
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
        .select("id,title,severity,category,original_text,suggestion,exposure_likely,exposure_min,exposure_max,sort_order,gravidade,ancora_id,onera_parte_representada,justificativa_gravidade,confianca,polaridade_parte_representada,score_simetria,score_valor_exposto,score_prazo_reversibilidade,score_foro_execucao,conclusao,impacto_identificado,mitigacao,review_status,reviewed_at,finding_type,qualitative_level,gating_reason,ancoras(gravidade_referencia,titulo)")
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

  // A análise roda em duas fases (identificação de cláusulas, depois
  // detalhamento) como invocações HTTP separadas — cada uma com seu próprio
  // orçamento de 150s de idle timeout da Edge Function. A Fase B, além
  // disso, roda em lotes de cláusulas (PHASE_B_BATCH_SIZE no backend): o
  // detalhamento de todas as cláusulas numa única chamada chegou a estourar
  // tanto o tempo quanto o max_tokens em contratos com muitas cláusulas.
  // Retry acontece por fase/lote, não pelo fluxo inteiro.
  const invokePhase = useCallback(async (
    phase: 'A' | 'B',
    body: Record<string, unknown>,
  ): Promise<{ error?: string; data?: { needs_phase_b?: boolean; has_more?: boolean } }> => {
    let lastMessage = 'Erro desconhecido';
    for (let attempt = 1; attempt <= ANALYSIS_MAX_ATTEMPTS; attempt++) {
      if (attempt > 1) setRetrying(true);
      // Timeout no cliente (acima do idle timeout de 150s da Edge Function) —
      // sem isso, uma requisição que trava sem nunca responder (rede) deixava
      // o usuário preso em "Analisando..." indefinidamente, sem erro nem retry.
      const { data, error } = await supabase.functions.invoke('analyze-contract', {
        body: { ...body, phase },
        timeout: 160000,
      });

      if (!error) {
        return { data: data as { needs_phase_b?: boolean; has_more?: boolean } };
      }

      // FunctionsHttpError.message é um texto genérico "non-2xx status code" —
      // o erro de verdade está no corpo da resposta, acessível via error.context
      // (só existe um Response de verdade nesse tipo específico de erro).
      let message = error.message ?? String(error);
      const context = (error as { context?: Response }).context;
      const isHttpError = error.name === 'FunctionsHttpError';
      if (isHttpError && context && typeof context.json === 'function') {
        try {
          const responseBody = await context.json();
          if (responseBody?.error) message = responseBody.error;
        } catch {
          // corpo da resposta não era JSON — mantém a mensagem genérica
        }
      }
      lastMessage = message;

      // FunctionsFetchError/FunctionsRelayError (nome, não status) = a
      // requisição nem chegou a ter resposta HTTP — rede, timeout do
      // cliente, ou o relay do Supabase não alcançou a function. Sempre
      // falha de infra. Em FunctionsHttpError, só é infra se status 5xx —
      // 4xx é erro de negócio (rate limit, texto não extraído) e não deve
      // ser retried.
      const isInfraFailure = !isHttpError || (context?.status ?? 0) >= 500;
      if (!isInfraFailure || attempt === ANALYSIS_MAX_ATTEMPTS) {
        return { error: message };
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
    }
    return { error: lastMessage };
  }, []);

  const triggerAnalysis = useCallback(async (parteRepresentada?: string): Promise<{ error?: string }> => {
    if (!contractId) return { error: 'No contract ID' };
    setRetrying(false);

    try {
      const body = { contract_id: contractId, ...(parteRepresentada ? { parte_representada: parteRepresentada } : {}) };

      const resultA = await invokePhase('A', body);
      if (resultA.error) return { error: resultA.error };

      if (resultA.data?.needs_phase_b) {
        let batchIndex = 0;
        let hasMore = true;
        while (hasMore) {
          setRetrying(false); // cada lote começa sua própria contagem de tentativas
          const resultB = await invokePhase('B', { contract_id: contractId, batch_index: batchIndex });
          if (resultB.error) return { error: resultB.error };
          hasMore = resultB.data?.has_more === true;
          batchIndex++;
        }
      }

      await fetchAll();
      return {};
    } finally {
      setRetrying(false);
    }
  }, [contractId, fetchAll, invokePhase]);

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

  return { contract, content, analysis, clauses, loading, notFound, retrying, refetch: fetchAll, triggerAnalysis, saveContractValue, updateClauseReview, updateClauseSuggestion };
}
