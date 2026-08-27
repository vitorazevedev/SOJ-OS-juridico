import { useEffect, useRef, useState } from "react";
import { SojCard } from "@/components/layout/Primitives";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { FileText, MoreVertical, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { fmtDate, STATUS_LABEL } from "@/lib/adminDashboard";

type StaffContract = {
  id: string;
  name: string;
  status: string;
  created_at: string;
  org_id: string;
  org_name: string;
  analysis_id: string | null;
  courtesy_unlock: boolean;
  contact_name: string | null;
  contact_email: string | null;
};

const PAGE_SIZE = 10;

// Painel Dev — localizar um contrato (por nome do contrato, da organização
// ou contato) e liberar/revogar a visualização completa do índice de
// desequilíbrio de UMA análise específica, sem promover a organização
// inteira pra Starter (o que liberaria tudo, não só essa análise). Gesto
// comercial pontual — caso real motivador: cliente Matrix, 2026-08-27.
export function RecentActivityFeed() {
  const [contracts, setContracts] = useState<StaffContract[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchContracts = async (p: number, s: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("list_staff_contracts", {
        p_search: s.trim() || undefined,
        p_page: p,
        p_page_size: PAGE_SIZE,
      });
      if (error) {
        toast.error("Erro ao carregar contratos");
        return;
      }
      const result = data as unknown as { total: number; rows: StaffContract[] };
      setContracts(result.rows);
      setTotal(result.total);
    } finally {
      setLoading(false);
    }
  };

  // Busca com debounce; volta pra página 1 a cada nova busca.
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setPage(1);
      fetchContracts(1, search);
    }, 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [search]);

  useEffect(() => {
    fetchContracts(page, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const setCourtesyUnlock = async (contract: StaffContract, unlock: boolean) => {
    if (!contract.analysis_id) return;
    setActingId(contract.id);
    try {
      const { error } = await supabase.rpc("staff_set_courtesy_unlock", {
        p_analysis_id: contract.analysis_id,
        p_unlock: unlock,
      });
      if (error) {
        toast.error("Erro ao atualizar visualização de cortesia");
        return;
      }
      toast.success(unlock ? "Visualização de cortesia liberada" : "Visualização de cortesia revogada");
      fetchContracts(page, search);
    } finally {
      setActingId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const statusBadge = (status: string) => (
    <span className={cn(
      "text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0",
      status === "analisado" ? "bg-primary-dim text-primary"
        : status === "em_analise" ? "bg-info/10 text-info"
        : "bg-muted text-muted-foreground"
    )}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );

  const actionsMenu = (contract: StaffContract) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" disabled={actingId === contract.id}>
          {actingId === contract.id
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <MoreVertical className="h-3.5 w-3.5" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {contract.analysis_id ? (
          <DropdownMenuItem onClick={() => setCourtesyUnlock(contract, !contract.courtesy_unlock)}>
            {contract.courtesy_unlock ? "Revogar visualização de cortesia" : "Liberar visualização de cortesia (Starter)"}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem disabled>Sem análise ainda</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <SojCard className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-sm font-medium">Atividade recente</h2>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por contrato, organização ou contato..."
          className="max-w-xs h-8 text-xs"
        />
      </div>

      {/* Mobile: lista de cards */}
      <div className="flex flex-col divide-y divide-border md:hidden">
        {contracts.map((c) => (
          <div key={c.id} className="flex items-start gap-3 py-2.5">
            <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs truncate">{c.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{c.org_name}</p>
              {c.courtesy_unlock && (
                <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-medium bg-primary-dim text-primary">
                  Cortesia liberada
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {statusBadge(c.status)}
              <span className="text-[10px] text-muted-foreground">{fmtDate(c.created_at)}</span>
              {actionsMenu(c)}
            </div>
          </div>
        ))}
        {!loading && contracts.length === 0 && (
          <p className="py-6 text-center text-xs text-muted-foreground">Nenhum contrato encontrado.</p>
        )}
      </div>

      {/* Desktop: tabela */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="pb-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Contrato</th>
              <th className="pb-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Organização / contato</th>
              <th className="pb-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Status</th>
              <th className="pb-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground text-right">Enviado em</th>
              <th className="pb-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {contracts.map((c) => (
              <tr key={c.id}>
                <td className="py-2.5">
                  <div className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate max-w-[280px]">{c.name}</span>
                    {c.courtesy_unlock && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-primary-dim text-primary shrink-0">
                        Cortesia
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-2.5 text-muted-foreground text-xs">
                  <div>{c.org_name}</div>
                  <div>{c.contact_name ?? "—"}{c.contact_email ? ` · ${c.contact_email}` : ""}</div>
                </td>
                <td className="py-2.5">{statusBadge(c.status)}</td>
                <td className="py-2.5 text-right text-muted-foreground text-xs">{fmtDate(c.created_at)}</td>
                <td className="py-2.5 text-right">{actionsMenu(c)}</td>
              </tr>
            ))}
            {!loading && contracts.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-xs text-muted-foreground">
                  Nenhum contrato encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{total} contrato(s)</span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline" size="sm" className="h-7 px-2 text-xs"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => p - 1)}
          >
            Anterior
          </Button>
          <span>{page} / {totalPages}</span>
          <Button
            variant="outline" size="sm" className="h-7 px-2 text-xs"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima
          </Button>
        </div>
      </div>
    </SojCard>
  );
}
