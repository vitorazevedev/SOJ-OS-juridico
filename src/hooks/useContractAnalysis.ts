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

export type AnalysisProgress =
  | { step: "lendo" }
  | { step: "detalhando"; batchIndex: number; totalBatches: number }
  | { step: "finalizando" };

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
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);

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

  // Espelha PHASE_B_BATCH_SIZE em supabase/functions/analyze-contract/index.ts —
  // só para estimar quantos lotes a Fase B vai ter e mostrar progresso ao
  // usuário; o servidor é quem decide de fato quando parar (via has_more).
  const PHASE_B_BATCH_SIZE = 6;

  // Espelha STALE_LOCK_MS em runPhaseA (supabase/functions/analyze-contract) e
  // ANALYSIS_LOCK_STALE_MS em src/pages/Analysis.tsx — depois desse tempo sem
  // atividade, nenhuma aba está de fato trabalhando na análise, então é
  // seguro oferecer retomada em vez de mostrar "em andamento" pra sempre.
  const ANALYSIS_LOCK_STALE_MS = 5 * 60 * 1000;
  const isLockStale = (startedAt: string | null): boolean =>
    !startedAt || Date.now() - new Date(startedAt).getTime() >= ANALYSIS_LOCK_STALE_MS;

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
  ): Promise<{ error?: string; data?: { needs_phase_b?: boolean; has_more?: boolean; clauses_found?: number; already_in_progress?: boolean } }> => {
    let lastMessage = 'Erro desconhecido';
    // Fase A: se a resposta anterior veio truncada (contrato com muitas
    // cláusulas), a própria function sinaliza needs_concise_retry=true — a
    // tentativa seguinte (já uma invocação HTTP nova, com orçamento de 150s
    // próprio) pede uma resposta mais compacta em vez de repetir a mesma
    // chamada que já sabemos que vai truncar de novo.
    let extraBody: Record<string, unknown> = {};
    for (let attempt = 1; attempt <= ANALYSIS_MAX_ATTEMPTS; attempt++) {
      if (attempt > 1) setRetrying(true);
      // Timeout no cliente (acima do idle timeout de 150s da Edge Function) —
      // sem isso, uma requisição que trava sem nunca responder (rede) deixava
      // o usuário preso em "Analisando..." indefinidamente, sem erro nem retry.
      const { data, error } = await supabase.functions.invoke('analyze-contract', {
        body: { ...body, phase, ...extraBody },
        timeout: 160000,
      });

      if (!error) {
        return { data: data as { needs_phase_b?: boolean; has_more?: boolean; clauses_found?: number; already_in_progress?: boolean } };
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
          if (responseBody?.needs_concise_retry === true) extraBody = { concise: true };
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
    setProgress({ step: 'lendo' });

    try {
      const body = { contract_id: contractId, ...(parteRepresentada ? { parte_representada: parteRepresentada } : {}) };

      const resultA = await invokePhase('A', body);
      if (resultA.error) return { error: resultA.error };

      if (resultA.data?.needs_phase_b) {
        const totalBatches = Math.max(1, Math.ceil((resultA.data.clauses_found ?? PHASE_B_BATCH_SIZE) / PHASE_B_BATCH_SIZE));
        let batchIndex = 0;
        let hasMore = true;
        while (hasMore) {
          setRetrying(false); // cada lote começa sua própria contagem de tentativas
          setProgress({ step: 'detalhando', batchIndex, totalBatches });
          const resultB = await invokePhase('B', { contract_id: contractId, batch_index: batchIndex });
          if (resultB.error) return { error: resultB.error };
          hasMore = resultB.data?.has_more === true;
          batchIndex++;
        }
      }

      // Pausa curta e proposital: assim que a última chamada volta, o servidor
      // já marcou a análise como concluída — fetchAll() troca a tela pra visão
      // de resultado quase instantaneamente. Sem essa pausa, a 3ª etapa nunca
      // chega a ser visível antes da troca de tela.
      setProgress({ step: 'finalizando' });
      await new Promise((resolve) => setTimeout(resolve, 600));
      await fetchAll();
      return {};
    } finally {
      setRetrying(false);
      setProgress(null);
    }
  }, [contractId, fetchAll, invokePhase]);

  // Retoma uma Fase B interrompida (aba fechada, rede caiu, celular pausou o
  // navegador em segundo plano) sem refazer a Fase A — evita desperdiçar o
  // que já foi processado e cobrado, e não deixa o contrato preso esperando
  // alguém perceber manualmente (caso real: cliente Matrix, 2026-08-24).
  const resumePhaseB = useCallback(async (): Promise<{ error?: string }> => {
    if (!contractId || !analysis?.id) return { error: 'Nada para retomar' };
    setRetrying(false);

    try {
      // Descobre em que lote parou pelas cláusulas já detalhadas — evita
      // reprocessar lotes que já tinham terminado antes da interrupção.
      const { data: clauseRows } = await supabase
        .from('clause_risks')
        .select('id, conclusao')
        .eq('analysis_id', analysis.id)
        .order('sort_order', { ascending: true });
      const rows = clauseRows ?? [];
      const enrichedCount = rows.filter((r) => r.conclusao != null).length;
      const totalBatches = Math.max(1, Math.ceil(rows.length / PHASE_B_BATCH_SIZE));
      let batchIndex = Math.floor(enrichedCount / PHASE_B_BATCH_SIZE);
      let hasMore = true;
      let firstCall = true;
      while (hasMore) {
        setRetrying(false);
        setProgress({ step: 'detalhando', batchIndex, totalBatches });
        // resume:true só na primeira chamada dessa retomada — é o que reclama
        // o lock atomicamente no servidor. Se outra retomada (outra aba, o
        // vigia de cron) já pegou primeiro, para em silêncio: não é erro, o
        // Realtime atualiza a tela quando quem estiver processando terminar.
        const resultB = await invokePhase('B', { contract_id: contractId, batch_index: batchIndex, resume: firstCall });
        firstCall = false;
        if (resultB.error) return { error: resultB.error };
        if (resultB.data?.already_in_progress) return {};
        hasMore = resultB.data?.has_more === true;
        batchIndex++;
      }

      setProgress({ step: 'finalizando' });
      await new Promise((resolve) => setTimeout(resolve, 600));
      await fetchAll();
      return {};
    } finally {
      setRetrying(false);
      setProgress(null);
    }
  }, [contractId, analysis?.id, fetchAll, invokePhase]);

  // A Fase A já terminou (existe contract_analyses com status
  // pending_enrichment) mas nenhuma aba está de fato processando a Fase B
  // agora (lock obsoleto) — oferece retomada em vez de deixar preso.
  const needsResume =
    contract?.status === 'em_analise' &&
    analysis?.status === 'pending_enrichment' &&
    isLockStale(contract.analysis_started_at);

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

  return { contract, content, analysis, clauses, loading, notFound, retrying, progress, needsResume, refetch: fetchAll, triggerAnalysis, resumePhaseB, saveContractValue, updateClauseReview, updateClauseSuggestion };
}
