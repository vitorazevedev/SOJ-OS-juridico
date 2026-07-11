import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useContractAnalysis } from "@/hooks/useContractAnalysis";
import { useEconomicIndexes } from "@/hooks/useEconomicIndexes";
import { SojCard } from "@/components/layout/Primitives";
import { ArrowLeft, FileText, Loader2 } from "lucide-react";
import { AguardandoView } from "@/features/analysis/components/AguardandoView";
import { InAnaliseView } from "@/features/analysis/components/InAnaliseView";
import { AnalisadoView } from "@/features/analysis/components/AnalisadoView";
import { AnalysisFeedbackPrompt } from "@/features/analysis/components/AnalysisFeedbackPrompt";
import { fmtDate } from "@/lib/analysisFormat";

export default function Analysis() {
  const navigate = useNavigate();
  const { id } = useParams();

  if (!id) {
    return (
      <div className="flex flex-col gap-4 md:gap-6 max-w-[1400px] mx-auto animate-fade-in">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Análise de Contratos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Selecione um contrato para visualizar a análise jurídica e financeira.
          </p>
        </div>
        <SojCard className="flex flex-col items-center gap-4 py-14 text-center">
          <div className="h-14 w-14 rounded-full bg-muted/40 flex items-center justify-center">
            <FileText className="h-7 w-7 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">Nenhum contrato selecionado</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Acesse a lista de contratos e clique em um para ver a análise detalhada.
            </p>
          </div>
          <button
            onClick={() => navigate("/contracts")}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Ver Contratos
          </button>
        </SojCard>
      </div>
    );
  }

  return <AnalysisView id={id} />;
}

function AnalysisView({ id }: { id: string }) {
  const navigate = useNavigate();
  const { contract, content, analysis, clauses, loading, notFound, refetch, triggerAnalysis, saveContractValue } = useContractAnalysis(id);
  const { indexes } = useEconomicIndexes();

  const [inAnaliseTab, setInAnaliseTab] = useState<"info" | "texto">("info");
  const [analisadoTab, setAnalisadoTab] = useState<"juridica" | "financeiro" | "texto">("juridica");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    const { error } = await triggerAnalysis();
    setAnalyzing(false);
    if (error) {
      const { toast } = await import("sonner");
      if (error.includes('ANTHROPIC_API_KEY') || error.includes('api_key')) {
        toast.error("Chave da API não configurada. Configure ANTHROPIC_API_KEY no Supabase.");
      } else {
        toast.error(`Erro na análise: ${error}`);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !contract) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <p className="font-medium">Contrato não encontrado</p>
        <button
          onClick={() => navigate("/contracts")}
          className="text-sm text-primary hover:underline"
        >
          Voltar para Contratos
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6 max-w-[1400px] mx-auto animate-fade-in">
      {/* Mobile header */}
      <div className="md:hidden flex items-start gap-2">
        <button
          onClick={() => navigate("/contracts")}
          className="text-xs text-muted-foreground active:opacity-70 -ml-1 px-1 py-1"
          style={{ minHeight: 44, minWidth: 32 }}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-[15px] font-bold tracking-tight truncate">{contract.name}</h1>
          <p className="text-[10px] text-muted-foreground truncate">
            {contract.party && `${contract.party} · `}{contract.type ?? contract.status}
          </p>
        </div>
      </div>

      {/* Desktop header */}
      <div className="hidden md:flex flex-wrap items-start justify-between gap-4">
        <div>
          <button
            onClick={() => navigate("/contracts")}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft className="h-3 w-3" /> Voltar para Contratos
          </button>
          <h1 className="text-2xl font-semibold tracking-tight">{contract.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {[contract.party, contract.type, `Enviado em ${fmtDate(contract.created_at)}`]
              .filter(Boolean).join(" · ")}
          </p>
        </div>
        {contract.status !== "aguardando" && (
          <button
            onClick={refetch}
            className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border text-sm hover:bg-muted/40 transition-colors"
          >
            Atualizar
          </button>
        )}
      </div>

      {/* Status-based views */}
      {contract.status === "aguardando" && (
        <AguardandoView contract={contract} />
      )}

      {contract.status === "em_analise" && (
        <InAnaliseView
          contract={contract}
          content={content}
          tab={inAnaliseTab}
          setTab={setInAnaliseTab}
          onAnalyze={handleAnalyze}
          analyzing={analyzing}
        />
      )}

      {contract.status === "analisado" && analysis && contract.org_id && (
        <AnalysisFeedbackPrompt analysisId={analysis.id} orgId={contract.org_id} />
      )}

      {contract.status === "analisado" && analysis && (
        <AnalisadoView
          contract={contract}
          content={content}
          analysis={analysis}
          clauses={clauses}
          tab={analisadoTab}
          setTab={setAnalisadoTab}
          expanded={expanded}
          setExpanded={setExpanded}
          indexes={indexes}
          saveContractValue={saveContractValue}
        />
      )}

      {/* Fallback for unknown status */}
      {!["aguardando", "em_analise", "analisado"].includes(contract.status) && (
        <SojCard className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-sm text-muted-foreground">Status desconhecido: {contract.status}</p>
        </SojCard>
      )}
    </div>
  );
}
