import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthProvider";

type MfaStatus = "checking" | "needs-enroll" | "needs-challenge" | "ok";

async function checkMfaStatus(): Promise<MfaStatus> {
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const hasVerifiedFactor = (factors?.totp ?? []).length > 0;
  if (!hasVerifiedFactor) return "needs-enroll";

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  return aal?.currentLevel === "aal2" ? "ok" : "needs-challenge";
}

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();
  const [mfaStatus, setMfaStatus] = useState<MfaStatus>("checking");

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    checkMfaStatus().then((status) => { if (!cancelled) setMfaStatus(status); });
    return () => { cancelled = true; };
  }, [session]);

  if (loading || (session && mfaStatus === "checking")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (mfaStatus === "needs-enroll") {
    return <Navigate to="/mfa/enroll" state={{ from: location }} replace />;
  }

  if (mfaStatus === "needs-challenge") {
    return <Navigate to="/mfa/challenge" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
