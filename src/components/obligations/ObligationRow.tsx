import { useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle2, ExternalLink, MoreVertical, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { updateObligationStatus, deleteObligation, type DbObligation } from "@/hooks/useObligations";
import { daysUntil, formatBRL, formatDate, obligationTypeLabel, responsibleLabel, urgencyMeta } from "@/lib/obligationsFormat";

export function ObligationRow({ o }: { o: DbObligation }) {
  const navigate = useNavigate();
  const days = daysUntil(o.due_date);
  const meta = urgencyMeta(days, o.status);
  const value = formatBRL(o.value_cents);

  return (
    <div
      className="px-4 md:px-5 py-3 md:py-4 flex items-center gap-3 md:gap-4 hover:bg-muted/30 active:bg-muted/30 transition-colors"
      style={{ minHeight: 44 }}
    >
      <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", meta.dot)} />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] md:text-sm font-medium truncate">{o.description}</p>
        <p className="text-[10px] md:text-xs text-muted-foreground truncate">
          {o.contract?.name ?? "Contrato removido"} · {responsibleLabel(o.responsible)}
          {obligationTypeLabel(o.obligation_type) && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[9px] md:text-[10px] font-medium">
              {obligationTypeLabel(o.obligation_type)}
            </span>
          )}
        </p>
      </div>

      {value && (
        <span className="text-[11px] md:text-sm tabular-nums font-medium hidden sm:inline">{value}</span>
      )}

      <div className="flex flex-col md:flex-row items-end md:items-center gap-1 md:gap-2 shrink-0">
        <span className={cn("text-[10px] md:text-xs tabular-nums font-medium", meta.date)}>
          {formatDate(o.due_date)}
        </span>
        <span className={cn("text-[10px] md:text-[11px] px-2 py-0.5 md:py-1 rounded-md font-medium", meta.chip)}>
          {meta.label}
        </span>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted active:opacity-70 shrink-0"
            aria-label="Ações"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {o.status !== "cumprida" && (
            <DropdownMenuItem onClick={() => updateObligationStatus(o.id, "cumprida")}>
              <CheckCircle2 className="h-4 w-4 mr-2 text-primary" />
              Marcar como cumprida
            </DropdownMenuItem>
          )}
          {o.status !== "atrasada" && (
            <DropdownMenuItem onClick={() => updateObligationStatus(o.id, "atrasada")}>
              <AlertCircle className="h-4 w-4 mr-2 text-risk-critical" />
              Marcar como atrasada
            </DropdownMenuItem>
          )}
          {o.status !== "pendente" && (
            <DropdownMenuItem onClick={() => updateObligationStatus(o.id, "pendente")}>
              Reabrir como pendente
            </DropdownMenuItem>
          )}
          {o.contract_id && (
            <DropdownMenuItem onClick={() => navigate(`/analysis/${o.contract_id}`)}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Ver contrato
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-risk-critical focus:text-risk-critical"
            onClick={() => deleteObligation(o.id)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
