import { useEffect, useState } from "react";
import { SojCard } from "@/components/layout/Primitives";
import { AlertOctagon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fmtBRL } from "@/lib/adminDashboard";

// Modulo de Pagamentos, Fase 5a -- chargebacks em aberto (spec Peça 8).
// list_open_chargebacks() é RPC (security definer) porque a RLS normal de
// chargebacks restringe à própria organização; staff precisa ver de todas.

type OpenChargeback = {
  id: string;
  organization_id: string;
  organization_name: string;
  amount_cents: number;
  status: string;
  reason: string | null;
  documentation_due_at: string | null;
  created_at: string;
};

export function ChargebacksCard() {
  const [chargebacks, setChargebacks] = useState<OpenChargeback[] | null>(null);

  useEffect(() => {
    supabase.rpc("list_open_chargebacks").then(({ data }) => setChargebacks((data as OpenChargeback[]) ?? []));
  }, []);

  if (chargebacks != null && chargebacks.length === 0) return null;

  return (
    <SojCard className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <AlertOctagon className="h-4 w-4 text-risk-critical" />
        <h2 className="text-sm font-medium">Chargebacks em aberto</h2>
      </div>

      {chargebacks == null ? null : (
        <ul className="flex flex-col divide-y divide-border">
          {chargebacks.map((cb) => (
            <li key={cb.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <div>
                <p className="font-medium">{cb.organization_name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {cb.reason ?? "Sem motivo informado"}
                  {cb.documentation_due_at && (
                    <> · prazo de defesa: {new Date(cb.documentation_due_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</>
                  )}
                </p>
              </div>
              <span className="font-semibold tabular-nums text-risk-critical shrink-0">{fmtBRL(cb.amount_cents / 100)}</span>
            </li>
          ))}
        </ul>
      )}
    </SojCard>
  );
}
