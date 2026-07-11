import { useNavigate } from "react-router-dom";
import { SojCard, RiskBadge, StatusBadge } from "@/components/layout/Primitives";
import { ArrowRight, FileText, Loader2 } from "lucide-react";
import { fmtDate, statusLabel } from "@/lib/dashboardFormat";
import type { RecentContract } from "@/hooks/useDashboard";

export function RecentContractsTable({ loading, recentContracts }: { loading: boolean; recentContracts: RecentContract[] }) {
  const navigate = useNavigate();

  return (
    <SojCard padding={false}>
      <div className="flex items-center justify-between p-4 md:px-5 md:py-4">
        <h3 className="font-medium text-sm md:text-base">Contratos Recentes</h3>
        <button onClick={() => navigate("/contracts")} className="text-xs text-primary hover:underline">
          Ver todos →
        </button>
      </div>

      <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_24px] gap-3 px-5 py-2 border-t border-border text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>Contrato</span>
        <span>Tipo</span>
        <span>Status</span>
        <span>Score</span>
        <span>Data</span>
        <span />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground gap-2 border-t border-border">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
        </div>
      ) : recentContracts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-14 text-center border-t border-border">
          <div className="h-12 w-12 rounded-full bg-muted/40 flex items-center justify-center">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">Nenhum contrato cadastrado</p>
            <p className="text-xs text-muted-foreground mt-1">Envie um PDF ou DOCX para começar a análise de risco</p>
          </div>
          <button
            onClick={() => navigate("/contracts")}
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
          >
            Enviar primeiro contrato <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div>
          {recentContracts.map((c) => (
            <button
              key={c.id}
              onClick={() => navigate(`/analysis/${c.id}`)}
              className="w-full grid grid-cols-[1fr_auto] md:grid-cols-[2fr_1fr_1fr_1fr_1fr_24px] items-center gap-3 px-4 md:px-5 py-3 text-left border-t border-border hover:bg-muted/30 active:bg-muted/30 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{c.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{c.party}</p>
              </div>
              <span className="hidden md:block text-sm text-muted-foreground truncate">{c.type || "—"}</span>
              <span className="hidden md:block">
                <StatusBadge status={statusLabel(c.status) as never} />
              </span>
              <span className="hidden md:block">
                {c.risk_score != null ? <RiskBadge score={c.risk_score} /> : <span className="text-xs text-muted-foreground">—</span>}
              </span>
              <span className="hidden md:block text-sm text-muted-foreground tabular-nums">{fmtDate(c.created_at)}</span>
              <span className="text-muted-foreground text-xs justify-self-end">›</span>
            </button>
          ))}
        </div>
      )}
    </SojCard>
  );
}
