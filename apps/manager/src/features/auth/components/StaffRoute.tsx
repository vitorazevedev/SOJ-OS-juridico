import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthProvider";

type MfaStatus = "checking" | "needs-enroll" | "needs-challenge" | "ok";

// Renovacao de MFA a cada 12h (docs/MANAGER_SPEC.md, secao 2) -- depois
// desse tempo, a sessao continua logada mas precisa reconfirmar o segundo
// fator pra voltar a ter aal2.
const MFA_REVERIFY_MS = 12 * 60 * 60 * 1000;
const MFA_RECHECK_INTERVAL_MS = 5 * 60 * 1000;

async function checkMfaStatus(): Promise<MfaStatus> {
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const hasVerifiedFactor = (factors?.totp ?? []).some((f) => f.status === "verified");
  if (!hasVerifiedFactor) return "needs-enroll";

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel !== "aal2") return "needs-challenge";

  const totpAuth = aal.currentAuthenticationMethods?.find(
    (m): m is { method: string; timestamp: number } => typeof m === "object" && m.method === "totp",
  );
  const ageMs = totpAuth ? Date.now() - totpAuth.timestamp * 1000 : Infinity;
  if (ageMs > MFA_REVERIFY_MS) return "needs-challenge";

  return "ok";
}

export default function StaffRoute({ children }: { children: ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const location = useLocation();
  const [isStaff, setIsStaff] = useState<boolean | null>(null);
  const [mfaStatus, setMfaStatus] = useState<MfaStatus>("checking");

  useEffect(() => {
    if (!session) {
      setIsStaff(null);
      return;
    }
    supabase.rpc("is_staff").then(({ data }) => {
      setIsStaff(data === true);
    });
  }, [session]);

  useEffect(() => {
    if (!session || !isStaff) return;
    let cancelled = false;
    const run = () => checkMfaStatus().then((status) => { if (!cancelled) setMfaStatus(status); });
    run();
    const interval = setInterval(run, MFA_RECHECK_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [session, isStaff]);

  if (authLoading || (session && isStaff === null)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (!isStaff) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-sm text-center">
          <h1 className="text-lg font-semibold text-foreground">Acesso restrito</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Esta área é exclusiva da equipe Ponderum. Se você acredita que deveria ter acesso,
            fale com quem administra a equipe.
          </p>
        </div>
      </div>
    );
  }

  if (mfaStatus === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (mfaStatus === "needs-enroll") {
    return <Navigate to="/mfa/enroll" state={{ from: location }} replace />;
  }

  if (mfaStatus === "needs-challenge") {
    return <Navigate to="/mfa/challenge" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
