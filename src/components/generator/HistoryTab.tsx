import { useState } from "react";
import { SojCard } from "@/components/layout/Primitives";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { FileText, Download, Trash2, MoreHorizontal, Search, Inbox } from "lucide-react";
import { useGeneratedContracts, deleteGeneratedContract, type GeneratedContract } from "@/hooks/useGeneratedContracts";
import { generatePdfFromText, fetchLogoData, downloadBlob } from "@/lib/contractDocs";
import { getCurrentOrgLogoSignedUrl } from "@/hooks/useOrganization";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { TEMPLATES } from "@/data/soj";
import { cn } from "@/lib/utils";

function templateLabel(id: string) {
  return TEMPLATES.find((t) => t.id === id)?.title ?? id;
}

function formatBRL(cents: number | null) {
  if (cents == null) return null;
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function slugify(name: string) {
  return (name || "contrato")
    .normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "contrato";
}

function HistoryRow({ item, onDeleted }: { item: GeneratedContract; onDeleted: () => void }) {
  const date = new Date(item.created_at).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
  });
  const displayName = item.name || templateLabel(item.template_id);
  const slug = slugify(item.name || `${item.template_id}-${item.id.slice(0, 8)}`);

  const handleDocx = async () => {
    if (!item.file_path) { toast.error("Arquivo não encontrado"); return; }
    const { data, error } = await supabase.storage.from("contracts").download(item.file_path);
    if (error || !data) { toast.error("Erro ao baixar DOCX"); return; }
    downloadBlob(data, `${slug}.docx`);
  };

  const handlePdf = async () => {
    const text = item.content_docx || `CONTRATO\n\n${item.party_a ?? ""} ↔ ${item.party_b ?? ""}`;
    const logoSigned = await getCurrentOrgLogoSignedUrl();
    const logo = await fetchLogoData(logoSigned);
    downloadBlob(generatePdfFromText(text, logo), `${slug}.pdf`);
  };

  const handleDelete = async () => {
    try {
      await deleteGeneratedContract(item.id, item.file_path);
      onDeleted();
    } catch {
      toast.error("Erro ao excluir contrato");
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:bg-muted/20 transition-colors">
      <div className="h-9 w-9 rounded-lg bg-primary-dim text-primary flex items-center justify-center shrink-0">
        <FileText className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] md:text-sm font-medium truncate">{displayName}</p>
        <p className="text-[11px] md:text-xs text-muted-foreground truncate">
          {templateLabel(item.template_id)}
          {item.party_a && ` · ${item.party_a}`}
          {item.party_b && ` ↔ ${item.party_b}`}
          {item.value_cents ? ` · ${formatBRL(item.value_cents)}` : ""}
        </p>
      </div>
      <span className="text-[10px] md:text-xs text-muted-foreground tabular-nums shrink-0 hidden sm:inline">
        {date}
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted/50 transition-colors shrink-0">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleDocx}>
            <Download className="h-4 w-4 mr-2" /> Baixar DOCX
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handlePdf}>
            <Download className="h-4 w-4 mr-2" /> Baixar PDF
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-risk-critical focus:text-risk-critical"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4 mr-2" /> Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function HistoryTab() {
  const { items, loading, refresh } = useGeneratedContracts();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("todos");

  const templateOptions = Array.from(new Set(items.map((i) => i.template_id)));

  const filtered = items.filter((item) => {
    if (typeFilter !== "todos" && item.template_id !== typeFilter) return false;
    if (query) {
      const q = query.toLowerCase();
      const haystack = `${item.name ?? ""} ${item.party_a ?? ""} ${item.party_b ?? ""}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome ou parte..."
            className="w-full pl-9 pr-3 h-9 rounded-lg bg-muted/40 border border-border text-sm focus:outline-none focus:border-primary/60 transition-colors"
          />
        </div>
        {templateOptions.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto scroll-hide">
            {["todos", ...templateOptions].map((id) => (
              <button
                key={id}
                onClick={() => setTypeFilter(id)}
                className={cn(
                  "shrink-0 h-9 px-3 rounded-lg text-xs border transition-colors",
                  typeFilter === id
                    ? "bg-primary-dim border-primary/50 text-primary font-medium"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {id === "todos" ? "Todos" : templateLabel(id)}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <SojCard>
          <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
        </SojCard>
      ) : filtered.length === 0 ? (
        <SojCard>
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <div className="h-10 w-10 rounded-full bg-muted/40 flex items-center justify-center">
              <Inbox className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">
              {items.length === 0 ? "Nenhum contrato gerado ainda" : "Nenhum resultado encontrado"}
            </p>
            <p className="text-xs text-muted-foreground max-w-xs">
              {items.length === 0
                ? "Gere seu primeiro contrato na aba Novo Contrato."
                : "Tente outro filtro ou termo de busca."}
            </p>
          </div>
        </SojCard>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">{filtered.length} contrato{filtered.length !== 1 ? "s" : ""}</p>
          {filtered.map((item) => (
            <HistoryRow key={item.id} item={item} onDeleted={refresh} />
          ))}
        </div>
      )}
    </div>
  );
}
