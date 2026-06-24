import { useNavigate } from "react-router-dom";
import { FileText, CalendarClock, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SearchResult, SearchResultKind } from "@/hooks/useGlobalSearch";

const KIND_META: Record<SearchResultKind, { label: string; Icon: React.ElementType; color: string }> = {
  contract:   { label: "Contratos",         Icon: FileText,      color: "text-primary" },
  obligation: { label: "Obrigações",         Icon: CalendarClock, color: "text-[hsl(var(--risk-medium))]" },
  generated:  { label: "Contratos Gerados",  Icon: Sparkles,      color: "text-info" },
};

interface Props {
  query: string;
  results: SearchResult[];
  loading: boolean;
  onClose: () => void;
}

export function SearchPanel({ query, results, loading, onClose }: Props) {
  const navigate = useNavigate();

  const handleSelect = (r: SearchResult) => {
    navigate(r.href);
    onClose();
  };

  const byKind = (kind: SearchResultKind) => results.filter((r) => r.kind === kind);
  const sections: SearchResultKind[] = ["contract", "obligation", "generated"];
  const hasResults = results.length > 0;

  return (
    <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-full min-w-[340px] max-w-[520px] rounded-xl border border-border bg-popover shadow-xl overflow-hidden">
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Buscando…</span>
        </div>
      ) : !hasResults ? (
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhum resultado para <span className="font-medium text-foreground">"{query}"</span>
          </p>
        </div>
      ) : (
        <div className="py-2 max-h-[420px] overflow-y-auto">
          {sections.map((kind) => {
            const items = byKind(kind);
            if (items.length === 0) return null;
            const { label, Icon, color } = KIND_META[kind];
            return (
              <div key={kind}>
                <div className="flex items-center gap-2 px-4 py-2">
                  <Icon className={cn("h-3.5 w-3.5 shrink-0", color)} />
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                    {label}
                  </span>
                </div>
                {items.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => handleSelect(r)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/30 active:bg-muted/40 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate">{r.title}</p>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">{r.subtitle}</p>
                    </div>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
