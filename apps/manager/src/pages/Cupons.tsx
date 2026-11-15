import { useEffect, useState } from "react";
import { SojCard, Button } from "@ponderum/ui";
import { Loader2, Plus, Pencil, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fmtBRL } from "@/lib/adminDashboard";
import { useStaffRoles } from "@/hooks/useStaffRoles";
import { shortRuleLabel } from "@/lib/couponRuleText";
import { CouponFormDialog } from "@/components/financeiro/CouponFormDialog";
import { CouponRedemptionsDialog } from "@/components/financeiro/CouponRedemptionsDialog";

// Modulo de Cupom de Desconto, Etapa C (docs/CUPOM_SPEC.md, secao 7).
// financeiro/owner criam, editam e desativam; equipe so consulta (lista +
// resgates), pra atender clientes; dev nao acessa (gate de rota).

export type Coupon = {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percent" | "fixed";
  discount_value: number;
  duration: "once" | "repeating" | "forever";
  duration_cycles: number | null;
  valid_from: string;
  valid_until: string | null;
  max_redemptions: number | null;
  max_per_organization: number;
  allowed_plans: string[];
  allowed_methods: string[];
  new_customers_only: boolean;
  is_active: boolean;
  created_at: string;
  redemptions_count: number;
  revenue_cents: number;
  discount_granted_cents: number;
};

export default function Cupons() {
  const { roles } = useStaffRoles();
  const canEdit = roles.includes("financeiro") || roles.includes("owner");

  const [coupons, setCoupons] = useState<Coupon[] | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [redemptionsFor, setRedemptionsFor] = useState<Coupon | null>(null);

  const reload = () => supabase.rpc("list_coupons").then(({ data }) => setCoupons((data as Coupon[]) ?? []));

  useEffect(() => {
    reload();
  }, []);

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const handleSaved = () => {
    closeForm();
    reload();
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg md:text-2xl font-semibold tracking-tight">Cupons</h1>
          <p className="text-xs text-muted-foreground mt-0.5 font-mono">Ponderum · Cupons de desconto</p>
        </div>
        {canEdit && (
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Novo cupom
          </Button>
        )}
      </div>

      {!coupons ? (
        <div className="flex items-center justify-center min-h-[30vh]">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : coupons.length === 0 ? (
        <SojCard>
          <p className="text-sm text-muted-foreground text-center py-6">Nenhum cupom criado ainda.</p>
        </SojCard>
      ) : (
        <SojCard padding={false} className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] text-muted-foreground text-left border-b border-border">
                <th className="py-2.5 px-4 font-normal">Código</th>
                <th className="py-2.5 px-4 font-normal">Regra</th>
                <th className="py-2.5 px-4 font-normal">Validade</th>
                <th className="py-2.5 px-4 font-normal text-right">Usos</th>
                <th className="py-2.5 px-4 font-normal">Status</th>
                <th className="py-2.5 px-4 font-normal text-right">Receita</th>
                <th className="py-2.5 px-4 font-normal text-right">Desconto</th>
                <th className="py-2.5 px-4 font-normal" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {coupons.map((c) => (
                <tr key={c.id}>
                  <td className="py-2.5 px-4 font-mono text-xs">{c.code}</td>
                  <td className="py-2.5 px-4 text-xs text-muted-foreground">{shortRuleLabel(c)}</td>
                  <td className="py-2.5 px-4 text-xs text-muted-foreground">
                    {c.valid_until ? new Date(c.valid_until).toLocaleDateString("pt-BR") : "sem limite"}
                  </td>
                  <td className="py-2.5 px-4 text-right tabular-nums text-xs">
                    {c.redemptions_count}/{c.max_redemptions ?? "∞"}
                  </td>
                  <td className="py-2.5 px-4">
                    <span className={`text-[11px] px-1.5 py-0.5 rounded-md ${c.is_active ? "bg-primary-dim text-primary" : "bg-muted text-muted-foreground"}`}>
                      {c.is_active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right tabular-nums text-xs">{fmtBRL(c.revenue_cents / 100)}</td>
                  <td className="py-2.5 px-4 text-right tabular-nums text-xs">{fmtBRL(c.discount_granted_cents / 100)}</td>
                  <td className="py-2.5 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setRedemptionsFor(c)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                        title="Ver resgates"
                      >
                        <Users className="h-3.5 w-3.5" />
                      </button>
                      {canEdit && (
                        <button
                          onClick={() => {
                            setEditing(c);
                            setFormOpen(true);
                          }}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </SojCard>
      )}

      {canEdit && <CouponFormDialog open={formOpen} coupon={editing} onClose={closeForm} onSaved={handleSaved} />}
      <CouponRedemptionsDialog couponId={redemptionsFor?.id ?? null} couponCode={redemptionsFor?.code ?? ""} onClose={() => setRedemptionsFor(null)} />
    </div>
  );
}
