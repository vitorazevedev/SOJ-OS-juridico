import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/components/AuthProvider";

// Modulo de Pagamentos -- banner de assinatura suspensa (paused/expired por
// falta de pagamento, ver sync_subscription_to_organization e dunning).
// "Lembrar-me depois" reaparece no primeiro acesso do dia seguinte, não
// durante o mesmo dia -- mesmo padrão de persistência por usuário já usado
// em useOnboardingUI (DISMISSED_KEY).
const DISMISSED_KEY = "ponderum_suspended_banner_dismissed_on";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function SuspendedAccessBanner({ orgId }: { orgId: string | undefined }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [suspended, setSuspended] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    supabase
      .from("subscriptions")
      .select("status")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setSuspended(data?.status === "paused" || data?.status === "expired"));
  }, [orgId]);

  useEffect(() => {
    if (!user) return;
    try {
      setDismissed(window.localStorage.getItem(`${DISMISSED_KEY}_${user.id}`) === todayKey());
    } catch {
      setDismissed(false);
    }
  }, [user]);

  const remindLater = () => {
    setDismissed(true);
    if (!user) return;
    try {
      window.localStorage.setItem(`${DISMISSED_KEY}_${user.id}`, todayKey());
    } catch {
      // localStorage indisponível -- só não persiste, não quebra a tela
    }
  };

  if (!suspended || dismissed) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-risk-critical/30 bg-risk-critical-dim p-3 flex-wrap">
      <div className="flex items-center gap-2 text-xs text-risk-critical">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        Sua assinatura foi suspensa por falta de pagamento. Renove para voltar a analisar contratos normalmente.
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={remindLater}
          className="h-8 px-3 rounded-lg text-xs text-muted-foreground hover:bg-muted/40 transition-colors"
        >
          Lembrar-me depois
        </button>
        <button
          onClick={() => navigate("/settings?tab=plan")}
          className="h-8 px-3 rounded-lg bg-risk-critical text-white text-xs hover:opacity-90 transition-opacity"
        >
          Renovar assinatura
        </button>
      </div>
    </div>
  );
}
