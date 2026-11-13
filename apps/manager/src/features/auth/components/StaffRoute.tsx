import { ReactNode, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthProvider";

export default function StaffRoute({ children }: { children: ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const [isStaff, setIsStaff] = useState<boolean | null>(null);

  useEffect(() => {
    if (!session) {
      setIsStaff(null);
      return;
    }
    supabase.rpc("is_staff").then(({ data }) => {
      setIsStaff(data === true);
    });
  }, [session]);

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

  return <>{children}</>;
}
