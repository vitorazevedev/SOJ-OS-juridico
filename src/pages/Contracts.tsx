import { useState, useRef } from "react";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { useContracts, uploadContract, deleteContract, renameContract, type DbContract, type ParsedData } from "@/hooks/useContracts";
import { SojCard, RiskBadge } from "@/components/layout/Primitives";
import { ContractParseStatus, contractStatusLabel } from "@/features/contracts/components/ContractParseStatus";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Upload, MoreHorizontal, ArrowUpRight, Search,
  SlidersHorizontal, Plus, Loader2, FileText,
  RefreshCw, Trash2, Pencil, ArrowUpDown, ArrowUp, ArrowDown,
  Calendar, Banknote, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ACCEPT, maxBytesFor, maxLabelFor, validateMagicBytes } from "@/lib/fileValidation";

// ─── types ───────────────────────────────────────────────────────────────────

type FilterId = "todos" | "analisado" | "em_analise" | "aguardando";
type SortField = "name" | "created_at" | "risk_score";
type SortDir = "asc" | "desc";

// ─── helpers ─────────────────────────────────────────────────────────────────

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

const initialsFor = (c: DbContract) => {
  const src = c.party || c.name || "??";
  return src.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase() || "C";
};

const formatBRL = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const formatDateShort = (iso: string | null) => {
  if (!iso) return null;
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
  } catch {
    return null;
  }
};

function ParsedChips({ data }: { data: ParsedData }) {
  const chips: { icon: typeof Calendar; label: string }[] = [];
  const dateLabel = formatDateShort(data.signing_date ?? data.start_date);
  if (dateLabel) chips.push({ icon: Calendar, label: dateLabel });
  if (data.contract_value_brl) chips.push({ icon: Banknote, label: formatBRL(data.contract_value_brl) });
  if (data.parties.length > 1) chips.push({ icon: Users, label: `${data.parties.length} partes` });
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {chips.map(({ icon: Icon, label }) => (
        <span key={label} className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/40 rounded px-1.5 py-0.5">
          <Icon className="h-2.5 w-2.5" />
          {label}
        </span>
      ))}
    </div>
  );
}

function applySort(list: DbContract[], field: SortField, dir: SortDir): DbContract[] {
  return [...list].sort((a, b) => {
    let cmp = 0;
    if (field === "name") {
      cmp = a.name.localeCompare(b.name, "pt-BR");
    } else if (field === "created_at") {
      cmp = a.created_at.localeCompare(b.created_at);
    } else if (field === "risk_score") {
      cmp = (a.risk_score ?? -1) - (b.risk_score ?? -1);
    }
    return dir === "asc" ? cmp : -cmp;
  });
}

// ─── RenameDialog ─────────────────────────────────────────────────────────────

const renameSchema = z.object({
  name: z.string().trim().min(1, "Nome não pode ficar vazio").max(200, "Máximo de 200 caracteres"),
});

function RenameDialog({
  contract,
  onClose,
  onRenamed,
}: {
  contract: DbContract;
  onClose: () => void;
  onRenamed: () => void;
}) {
  const [name, setName] = useState(contract.name);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (name.trim() === contract.name) { onClose(); return; }
    const result = renameSchema.safeParse({ name });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    setSaving(true);
    try {
      await renameContract(contract.id, result.data.name);
      toast.success("Contrato renomeado");
      onRenamed();
      onClose();
    } catch {
      toast.error("Erro ao renomear contrato");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm flex flex-col gap-4 shadow-xl">
        <h3 className="font-semibold text-base">Renomear contrato</h3>
        <input
          autoFocus
          value={name}
          onChange={(e) => { setName(e.target.value); setError(null); }}
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") onClose(); }}
          className={cn(
            "w-full rounded-[10px] border bg-[rgba(255,255,255,0.05)] text-foreground focus:outline-none transition-colors",
            error ? "border-destructive/70" : "border-[rgba(255,255,255,0.1)] focus:border-[rgba(0,229,160,0.6)]",
          )}
          style={{ padding: "11px 12px", minHeight: 44 }}
        />
        {error && <p className="text-[10px] text-destructive -mt-2">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-lg border border-border text-sm hover:bg-muted/40 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SortIcon ────────────────────────────────────────────────────────────────

function SortIcon({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) {
  if (field !== sortField) return <ArrowUpDown className="h-3 w-3 opacity-40 ml-1 inline" />;
  return sortDir === "asc"
    ? <ArrowUp className="h-3 w-3 ml-1 inline text-primary" />
    : <ArrowDown className="h-3 w-3 ml-1 inline text-primary" />;
}

// ─── main page ───────────────────────────────────────────────────────────────

export default function Contracts() {
  const navigate = useNavigate();
  const { contracts, loading, processingIds, markProcessing, refetch } = useContracts();

  const [filter, setFilter] = useState<FilterId>("todos");
  const [query, setQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [uploading, setUploading] = useState(false);
  const [renaming, setRenaming] = useState<DbContract | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // counts per status
  const counts: Record<FilterId, number> = {
    todos: contracts.length,
    analisado: contracts.filter((c) => c.status === "analisado").length,
    em_analise: contracts.filter((c) => c.status === "em_analise").length,
    aguardando: contracts.filter((c) => c.status === "aguardando").length,
  };

  const FILTERS: { id: FilterId; label: string }[] = [
    { id: "todos", label: "Todos" },
    { id: "analisado", label: "Analisados" },
    { id: "em_analise", label: "Em análise" },
    { id: "aguardando", label: "Aguardando" },
  ];

  const filtered = applySort(
    contracts.filter((c) => {
      if (filter !== "todos" && c.status !== filter) return false;
      if (query && !`${c.name} ${c.party ?? ""} ${c.type ?? ""}`.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    }),
    sortField,
    sortDir,
  );

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > maxBytesFor(file)) { toast.error(`${file.name}: arquivo maior que ${maxLabelFor(file)}`); continue; }
        const validMagic = await validateMagicBytes(file);
        if (!validMagic) { toast.error(`${file.name}: tipo de arquivo inválido ou não suportado`); continue; }
        const inserted = await uploadContract(file, markProcessing);
        if (inserted) refetch();
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDelete = async (c: DbContract) => {
    if (!confirm(`Excluir "${c.name}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await deleteContract(c.id, c.file_path);
      toast.success("Contrato excluído");
      refetch();
    } catch {
      toast.error("Erro ao excluir contrato");
    }
  };

  const openPicker = () => inputRef.current?.click();

  return (
    <div className="flex flex-col gap-4 md:gap-6 max-w-[1400px] mx-auto animate-fade-in relative">
      <input ref={inputRef} type="file" accept={ACCEPT} multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />

      {renaming && (
        <RenameDialog contract={renaming} onClose={() => setRenaming(null)} onRenamed={refetch} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg md:text-2xl font-semibold tracking-tight">Contratos</h1>
          <p className="hidden md:block text-sm text-muted-foreground mt-1">Gerencie e analise seus contratos</p>
        </div>
        <button className="md:hidden h-10 w-10 rounded-lg border border-border flex items-center justify-center text-muted-foreground active:opacity-70">
          <SlidersHorizontal className="h-4 w-4" />
        </button>
        <button
          onClick={openPicker}
          disabled={uploading}
          className="hidden md:inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Upload de Contrato
        </button>
      </div>

      {/* Mobile search */}
      <div className="md:hidden relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar contratos..."
          className="w-full pl-10 pr-3 rounded-[10px] border text-sm focus:outline-none transition-colors"
          style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.08)", padding: "9px 12px 9px 36px", minHeight: 44 }}
        />
      </div>

      {/* Drop zone */}
      <button
        onClick={openPicker}
        disabled={uploading}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
        className="border-2 border-dashed border-border rounded-xl px-4 py-7 md:p-10 flex flex-col items-center justify-center gap-2 hover:border-primary/60 hover:bg-primary-dim transition-all active:opacity-70 disabled:opacity-60"
      >
        <div className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-primary-dim text-primary flex items-center justify-center text-xl md:text-2xl">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "⊕"}
        </div>
        <p className="text-[13px] md:text-sm font-medium text-center">
          {uploading ? "Enviando..." : "Arraste contratos aqui ou clique para fazer upload"}
        </p>
        <p className="text-[11px] md:text-xs text-muted-foreground">PDF (máx. 32MB) · DOCX (máx. 50MB) · Imagem (máx. 5MB)</p>
      </button>

      {/* Filters + search */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto scroll-hide -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap">
          {FILTERS.map((f) => {
            const active = filter === f.id;
            const count = counts[f.id];
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "shrink-0 rounded-full text-[11px] md:text-xs border transition-all active:opacity-70 flex items-center gap-1.5",
                  active ? "font-medium" : "text-muted-foreground hover:text-foreground",
                )}
                style={{
                  padding: "6px 12px",
                  minHeight: 32,
                  ...(active
                    ? { borderColor: "rgba(0,229,160,0.5)", color: "#00e5a0", background: "rgba(0,229,160,0.08)" }
                    : { borderColor: "hsl(var(--border))" }),
                }}
              >
                {f.label}
                {count > 0 && (
                  <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] tabular-nums", active ? "bg-[rgba(0,229,160,0.15)]" : "bg-muted/60")}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="hidden md:block relative w-64 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar..."
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-muted/40 border border-border text-sm focus:outline-none focus:border-primary/60 transition-colors"
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando contratos...
        </div>
      ) : filtered.length === 0 ? (
        <SojCard padding={false}>
          <div className="px-5 py-12 flex flex-col items-center text-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-muted/40 flex items-center justify-center text-muted-foreground">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium">
                {contracts.length === 0 ? "Nenhum contrato ainda" : "Nenhum contrato encontrado"}
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                {contracts.length === 0 ? "Faça upload de um PDF ou DOCX para extrair cláusulas e obrigações automaticamente." : "Tente outro filtro ou termo de busca."}
              </p>
            </div>
            {contracts.length === 0 && (
              <button
                onClick={openPicker}
                className="mt-1 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Fazer upload
              </button>
            )}
          </div>
        </SojCard>
      ) : (
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
                <ContractMenu contract={c} onDelete={handleDelete} onRename={setRenaming} onAnalyze={() => navigate(`/analysis/${c.id}`)} />
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
                          <ContractMenu contract={c} onDelete={handleDelete} onRename={setRenaming} onAnalyze={() => navigate(`/analysis/${c.id}`)} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SojCard>
        </>
      )}

      {/* Mobile FAB */}
      <button
        onClick={openPicker}
        disabled={uploading}
        className="md:hidden fixed right-4 h-12 w-12 rounded-full flex items-center justify-center shadow-lg active:opacity-80 transition-opacity z-40 disabled:opacity-60"
        style={{ bottom: "calc(84px + env(safe-area-inset-bottom))", background: "#00e5a0", color: "#000" }}
        aria-label="Upload de contrato"
      >
        {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
      </button>
    </div>
  );
}

// ─── ContractMenu ────────────────────────────────────────────────────────────

function ContractMenu({
  contract,
  onDelete,
  onRename,
  onAnalyze,
}: {
  contract: DbContract;
  onDelete: (c: DbContract) => void;
  onRename: (c: DbContract) => void;
  onAnalyze: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="h-8 w-8 rounded-md hover:bg-muted/50 flex items-center justify-center text-muted-foreground shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={onAnalyze}>
          <ArrowUpRight className="h-4 w-4 mr-2" /> Ver análise
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onRename(contract)}>
          <Pencil className="h-4 w-4 mr-2" /> Renomear
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-risk-critical focus:text-risk-critical"
          onClick={() => onDelete(contract)}
        >
          <Trash2 className="h-4 w-4 mr-2" /> Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
