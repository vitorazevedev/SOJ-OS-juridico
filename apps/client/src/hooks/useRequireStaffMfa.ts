import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type StaffMfaStatus = "loading" | "not-staff" | "needs-enroll" | "needs-challenge" | "ok";

// Gate de MFA pras telas staff-only do app do cliente (Admin, Financeiro,
// Equipe Ponderum). Só confirma que a sessao atual chegou a aal2 -- sem
// renovacao periodica nem idle-timeout, que sao regras especificas da
// sessao do manager (docs/MANAGER_SPEC.md, secao 2) e nao fazem sentido
// pra um cliente pagante usando o resto do app.
export function useRequireStaffMfa(hasPermission: boolean, permissionLoading: boolean): StaffMfaStatus {
  const [status, setStatus] = useState<StaffMfaStatus>("loading");

  useEffect(() => {
    if (permissionLoading) {
      setStatus("loading");
      return;
    }
    if (!hasPermission) {
      setStatus("not-staff");
      return;
    }

    let cancelled = false;
    supabase.auth.mfa.listFactors().then(async ({ data: factors }) => {
      const hasVerifiedFactor = (factors?.totp ?? []).some((f) => f.status === "verified");
      if (!hasVerifiedFactor) {
        if (!cancelled) setStatus("needs-enroll");
        return;
      }
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (!cancelled) setStatus(aal?.currentLevel === "aal2" ? "ok" : "needs-challenge");
    });

    return () => { cancelled = true; };
  }, [hasPermission, permissionLoading]);

  return status;
}
