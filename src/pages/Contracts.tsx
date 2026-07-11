import { useState, useRef } from "react";
import { useContracts, uploadContract, deleteContract, type DbContract } from "@/hooks/useContracts";
import { Upload, Search, SlidersHorizontal, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ACCEPT, maxBytesFor, maxLabelFor, validateMagicBytes } from "@/lib/fileValidation";
import { applySort, type SortDir, type SortField } from "@/lib/contractListFormat";
import { RenameDialog } from "@/components/contracts/RenameDialog";
import { ContractsList } from "@/components/contracts/ContractsList";

type FilterId = "todos" | "analisado" | "em_analise" | "aguardando";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "analisado", label: "Analisados" },
  { id: "em_analise", label: "Em análise" },
  { id: "aguardando", label: "Aguardando" },
];

export default function Contracts() {
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

      <ContractsList
        loading={loading}
        filtered={filtered}
        totalCount={contracts.length}
        processingIds={processingIds}
        sortField={sortField}
        sortDir={sortDir}
        toggleSort={toggleSort}
        onOpenPicker={openPicker}
        onDelete={handleDelete}
        onRename={setRenaming}
      />

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
