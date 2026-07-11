import { useNavigate } from "react-router-dom";
import { SojCard, RiskBadge } from "@/components/layout/Primitives";
import { ContractParseStatus, contractStatusLabel } from "@/features/contracts/components/ContractParseStatus";
import { ArrowUp, ArrowUpDown, ArrowUpRight, ArrowDown, FileText, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { ParsedChips } from "@/components/contracts/ParsedChips";
import { ContractMenu } from "@/components/contracts/ContractMenu";
import { formatDate, initialsFor, type SortDir, type SortField } from "@/lib/contractListFormat";
import type { DbContract } from "@/hooks/useContracts";

function SortIcon({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) {
  if (field !== sortField) return <ArrowUpDown className="h-3 w-3 opacity-40 ml-1 inline" />;
  return sortDir === "asc"
    ? <ArrowUp className="h-3 w-3 ml-1 inline text-primary" />
    : <ArrowDown className="h-3 w-3 ml-1 inline text-primary" />;
}

export function ContractsList({
  loading,
  filtered,
  totalCount,
  processingIds,
  sortField,
  sortDir,
  toggleSort,
  onOpenPicker,
  onDelete,
  onRename,
}: {
  loading: boolean;
  filtered: DbContract[];
  totalCount: number;
  processingIds: Set<string>;
  sortField: SortField;
  sortDir: SortDir;
  toggleSort: (field: SortField) => void;
  onOpenPicker: () => void;
  onDelete: (c: DbContract) => void;
  onRename: (c: DbContract) => void;
}) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
        <RefreshCw className="h-4 w-4 animate-spin" /> Carregando contratos...
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <SojCard padding={false}>
        <div className="px-5 py-12 flex flex-col items-center text-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-muted/40 flex items-center justify-center text-muted-foreground">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium">
              {totalCount === 0 ? "Nenhum contrato ainda" : "Nenhum contrato encontrado"}
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              {totalCount === 0 ? "Faça upload de um PDF ou DOCX para extrair cláusulas e obrigações automaticamente." : "Tente outro filtro ou termo de busca."}
            </p>
          </div>
          {totalCount === 0 && (
            <button
              onClick={onOpenPicker}
              className="mt-1 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Fazer upload
            </button>
          )}
        </div>
      </SojCard>
    );
  }

  return (
    <>
      {/* Mobile list */}
      <SojCard padding={false} className="md:hidden">
        {filtered.map((c, i) => (
          <div
            key={c.id}
            className={cn("flex items-center gap-3 px-4 py-3 transition-colors", i > 0 && "border-t")}
            style={{ borderColor: "rgba(255,255,255,0.05)" }}
          >
            <button
              onClick={() => navigate(`/analysis/${c.id}`)}
              className="flex items-center gap-3 flex-1 min-w-0 text-left active:opacity-70"
              style={{ minHeight: 44 }}
            >
              <div className="h-9 w-9 rounded-[10px] flex items-center justify-center text-xs font-bold shrink-0 bg-primary-dim text-primary">
                {initialsFor(c)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate">{c.name}</p>
                <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                  {processingIds.has(c.id) && <RefreshCw className="h-2.5 w-2.5 animate-spin shrink-0" />}
                  {processingIds.has(c.id) ? "Processando..." : (c.party || contractStatusLabel(c.status))}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-[10px] text-muted-foreground">{formatDate(c.created_at)}</span>
                {c.status === "analisado" && c.risk_score != null && <RiskBadge score={c.risk_score} />}
              </div>
            </button>
            <ContractMenu contract={c} onDelete={onDelete} onRename={onRename} onAnalyze={() => navigate(`/analysis/${c.id}`)} />
          </div>
        ))}
      </SojCard>

      {/* Desktop table */}
      <SojCard padding={false} className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="text-left font-normal px-5 py-4">
                  <button onClick={() => toggleSort("name")} className="flex items-center hover:text-foreground transition-colors">
                    Contrato <SortIcon field="name" sortField={sortField} sortDir={sortDir} />
                  </button>
                </th>
                <th className="text-left font-normal px-5 py-4">Tipo</th>
                <th className="text-left font-normal px-5 py-4">Status</th>
                <th className="text-left font-normal px-5 py-4">
                  <button onClick={() => toggleSort("risk_score")} className="flex items-center hover:text-foreground transition-colors">
                    Score de Risco <SortIcon field="risk_score" sortField={sortField} sortDir={sortDir} />
                  </button>
                </th>
                <th className="text-left font-normal px-5 py-4">Tamanho</th>
                <th className="text-left font-normal px-5 py-4">
                  <button onClick={() => toggleSort("created_at")} className="flex items-center hover:text-foreground transition-colors">
                    Enviado em <SortIcon field="created_at" sortField={sortField} sortDir={sortDir} />
                  </button>
                </th>
                <th className="px-5 py-4" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/analysis/${c.id}`)}
                  className="border-t border-border hover:bg-muted/30 cursor-pointer transition-colors"
                >
                  <td className="px-5 py-3.5">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.party || c.file_name}</div>
                    {c.parsed_data && <ParsedChips data={c.parsed_data} />}
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">{c.type || "—"}</td>
                  <td className="px-5 py-3.5">
                    <ContractParseStatus status={c.status} />
                  </td>
                  <td className="px-5 py-3.5">
                    {processingIds.has(c.id) ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <RefreshCw className="h-3 w-3 animate-spin" /> Processando...
                      </span>
                    ) : c.status === "analisado" && c.risk_score != null ? (
                      <RiskBadge score={c.risk_score} />
                    ) : c.status === "em_analise" ? (
                      <span className="text-xs text-muted-foreground">Aguardando IA</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground tabular-nums text-xs">
                    {c.file_size ? `${(c.file_size / 1024).toFixed(0)} KB` : "—"}
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground tabular-nums">
                    {formatDate(c.created_at)}
                  </td>
                  <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => navigate(`/analysis/${c.id}`)}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        Analisar <ArrowUpRight className="h-3 w-3" />
                      </button>
                      <ContractMenu contract={c} onDelete={onDelete} onRename={onRename} onAnalyze={() => navigate(`/analysis/${c.id}`)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SojCard>
    </>
  );
}
