import { useEffect, useRef, useState } from "react";
import { SojCard } from "@/components/layout/Primitives";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { MoreVertical, MessageCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type StaffOrg = {
  id: string;
  name: string;
  cnpj: string | null;
  plan_id: string;
  plan_status: string;
  blocked: boolean;
  created_at: string;
  plan_renews_at: string | null;
  admin_name: string | null;
  admin_email: string | null;
  admin_phone: string | null;
};

const PAGE_SIZE = 10;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function renewalDaysLeft(iso: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

// "Freemium" e "Starter" pago sao a mesma organizacao (plan_id='starter'),
// diferenciados so por plan_status -- nao ha um plan_id distinto pra
// Freemium hoje no banco.
function upgradeWhatsappTemplate(name: string) {
  return `Olá${name ? `, ${name}` : ""}! Vi que você está usando o plano Freemium da Ponderum. Que tal conhecer o plano Starter, com análise jurídica completa e exportação de relatórios? Posso te passar os detalhes?`;
}

function waLink(phone: string | null, text: string) {
  const digits = (phone ?? "").replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function OrganizationsManagementList() {
  const [orgs, setOrgs] = useState<StaffOrg[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchOrgs = async (p: number, s: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("list_staff_organizations", {
        p_search: s.trim() || null,
        p_page: p,
        p_page_size: PAGE_SIZE,
      });
      if (error) {
        toast.error("Erro ao carregar organizações");
        return;
      }
      const result = data as unknown as { total: number; rows: StaffOrg[] };
      setOrgs(result.rows);
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
      fetchOrgs(1, search);
    }, 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [search]);

  useEffect(() => {
    fetchOrgs(page, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const setPlanStatus = async (org: StaffOrg, status: "trial" | "active") => {
    setActingId(org.id);
    try {
      const { error } = await supabase.rpc("staff_set_org_plan_status", { p_org_id: org.id, p_status: status });
      if (error) {
        toast.error("Erro ao atualizar plano");
        return;
      }
      toast.success(status === "active" ? "Organização marcada como Starter (pago)" : "Organização voltou para Freemium");
      fetchOrgs(page, search);
    } finally {
      setActingId(null);
    }
  };

  const renewSubscription = async (org: StaffOrg) => {
    setActingId(org.id);
    try {
      const { error } = await supabase.rpc("staff_renew_org_subscription", { p_org_id: org.id });
      if (error) {
        toast.error("Erro ao renovar assinatura");
        return;
      }
      toast.success("Assinatura renovada por mais 30 dias");
      fetchOrgs(page, search);
    } finally {
      setActingId(null);
    }
  };

  const setBlocked = async (org: StaffOrg, blocked: boolean) => {
    setActingId(org.id);
    try {
      const { error } = await supabase.rpc("staff_set_org_blocked", { p_org_id: org.id, p_blocked: blocked });
      if (error) {
        toast.error("Erro ao atualizar bloqueio");
        return;
      }
      toast.success(blocked ? "Organização bloqueada" : "Organização desbloqueada");
      fetchOrgs(page, search);
    } finally {
      setActingId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <SojCard className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-sm font-medium">Organizações</h2>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, CNPJ, email ou telefone..."
          className="max-w-xs h-8 text-xs"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="pb-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Organização</th>
              <th className="pb-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Contato</th>
              <th className="pb-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">CNPJ/CPF</th>
              <th className="pb-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Plano</th>
              <th className="pb-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground text-right">Vence em</th>
              <th className="pb-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground text-right">Criada em</th>
              <th className="pb-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orgs.map((org) => {
              const isTrial = org.plan_status === "trial";
              const daysLeft = renewalDaysLeft(org.plan_renews_at);
              return (
                <tr key={org.id}>
                  <td className="py-2.5">{org.name}</td>
                  <td className="py-2.5 text-muted-foreground text-xs">
                    <div>{org.admin_name ?? "—"}</div>
                    <div>{org.admin_email ?? "—"}</div>
                  </td>
                  <td className="py-2.5 text-muted-foreground text-xs">{org.cnpj ?? "—"}</td>
                  <td className="py-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-medium",
                        isTrial ? "bg-muted text-muted-foreground" : "bg-primary-dim text-primary"
                      )}>
                        {isTrial ? "Freemium" : "Starter"}
                      </span>
                      {org.blocked && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-destructive/10 text-destructive">
                          Bloqueada
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 text-right text-muted-foreground text-xs">
                    {isTrial ? "—" : daysLeft == null ? "—" : daysLeft <= 0 ? "Vencida" : `${daysLeft}d`}
                  </td>
                  <td className="py-2.5 text-right text-muted-foreground text-xs">{fmtDate(org.created_at)}</td>
                  <td className="py-2.5 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={actingId === org.id}>
                          {actingId === org.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <MoreVertical className="h-3.5 w-3.5" />}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {isTrial && org.admin_phone && (
                          <DropdownMenuItem
                            onClick={() => window.open(waLink(org.admin_phone, upgradeWhatsappTemplate(org.admin_name ?? "")), "_blank")}
                          >
                            <MessageCircle className="h-3.5 w-3.5 mr-2" /> Chamar no WhatsApp (upgrade)
                          </DropdownMenuItem>
                        )}
                        {isTrial ? (
                          <DropdownMenuItem onClick={() => setPlanStatus(org, "active")}>
                            Confirmar upgrade (marcar como pago)
                          </DropdownMenuItem>
                        ) : (
                          <>
                            <DropdownMenuItem onClick={() => renewSubscription(org)}>
                              Renovar assinatura (+30 dias)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setPlanStatus(org, "trial")}>
                              Rebaixar para Freemium
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuItem onClick={() => setBlocked(org, !org.blocked)}>
                          {org.blocked ? "Desbloquear" : "Bloquear"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
            {!loading && orgs.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-xs text-muted-foreground">
                  Nenhuma organização encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{total} organização(ões)</span>
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
