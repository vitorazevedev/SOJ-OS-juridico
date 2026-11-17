import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@ponderum/ui";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fmtBRL } from "@/lib/adminDashboard";

type Redemption = {
  id: string;
  organization_name: string;
  status: "active" | "completed" | "canceled";
  cycles_total: number | null;
  cycles_used: number;
  full_amount_cents: number;
  discounted_amount_cents: number;
  created_at: string;
  completed_at: string | null;
};

const STATUS_LABEL: Record<Redemption["status"], string> = {
  active: "Ativo",
  completed: "Concluído",
  canceled: "Cancelado",
};

export function CouponRedemptionsDialog({ couponId, couponCode, onClose }: { couponId: string | null; couponCode: string; onClose: () => void }) {
  const [redemptions, setRedemptions] = useState<Redemption[] | null>(null);

  useEffect(() => {
    if (!couponId) return;
    setRedemptions(null);
    supabase.rpc("get_coupon_redemptions", { p_coupon_id: couponId }).then(({ data }) => setRedemptions((data as Redemption[]) ?? []));
  }, [couponId]);

  return (
    <Dialog open={!!couponId} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg w-full max-h-[80vh] overflow-y-auto scroll-thin">
        <DialogHeader>
          <DialogTitle>Resgates — {couponCode}</DialogTitle>
        </DialogHeader>
        {!redemptions ? (
          <div className="flex items-center justify-center min-h-[20vh]">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : redemptions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma organização usou este cupom ainda.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border mt-2">
            {redemptions.map((r) => (
              <li key={r.id} className="py-3 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{r.organization_name}</span>
                  <span className="text-xs text-muted-foreground">{STATUS_LABEL[r.status]}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {r.cycles_total == null
                      ? `${r.cycles_used} ciclos usados (sem limite)`
                      : `${r.cycles_used}/${r.cycles_total} ciclos usados`}
                  </span>
                  <span className="tabular-nums">
                    {fmtBRL(r.discounted_amount_cents / 100)} (cheio {fmtBRL(r.full_amount_cents / 100)})
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
