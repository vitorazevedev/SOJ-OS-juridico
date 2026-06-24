import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/components/AuthProvider";

export interface OnboardingState {
  loading: boolean;
  completed: boolean;
  orgId: string | null;
  steps: {
    dashboard: boolean;
    organization: boolean;
    contractUpload: boolean;
    contractGenerated: boolean;
    teamInvited: boolean;
  };
}

const LOCAL_STEP1_KEY = "soj_onboarding_step1_done";

export function useOnboarding() {
  const { user } = useAuth();
  const [state, setState] = useState<OnboardingState>({
    loading: true,
    completed: false,
    orgId: null,
    steps: {
      dashboard: false,
      organization: false,
      contractUpload: false,
      contractGenerated: false,
      teamInvited: false,
    },
  });

  const refresh = useCallback(async () => {
    if (!user) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }

    const { data: userRow } = await supabase
      .from("users")
      .select("org_id, onboarding_completed")
      .eq("id", user.id)
      .maybeSingle();

    if (!userRow) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }

    if (userRow.onboarding_completed) {
      setState({
        loading: false,
        completed: true,
        orgId: userRow.org_id,
        steps: {
          dashboard: true,
          organization: true,
          contractUpload: true,
          contractGenerated: true,
          teamInvited: true,
        },
      });
      return;
    }

    const orgId = userRow.org_id;
    const [orgRes, contractsRes, generatedRes, usersRes] = await Promise.all([
      supabase.from("organizations").select("cnpj, logo_url").eq("id", orgId).maybeSingle(),
      supabase.from("contracts").select("id", { count: "exact", head: true }).eq("org_id", orgId),
      supabase.from("generated_contracts").select("id", { count: "exact", head: true }).eq("org_id", orgId),
      supabase.from("users").select("id", { count: "exact", head: true }).eq("org_id", orgId),
    ]);

    const dashboardDone =
      typeof window !== "undefined" &&
      window.localStorage.getItem(`${LOCAL_STEP1_KEY}_${user.id}`) === "1";

    setState({
      loading: false,
      completed: false,
      orgId,
      steps: {
        dashboard: dashboardDone,
        organization: !!(orgRes.data?.cnpj && orgRes.data?.logo_url),
        contractUpload: (contractsRes.count ?? 0) >= 1,
        contractGenerated: (generatedRes.count ?? 0) >= 1,
        teamInvited: (usersRes.count ?? 0) > 1,
      },
    });
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const markDashboardDone = useCallback(() => {
    if (!user) return;
    window.localStorage.setItem(`${LOCAL_STEP1_KEY}_${user.id}`, "1");
    setState((s) => ({ ...s, steps: { ...s.steps, dashboard: true } }));
  }, [user]);

  const completeOnboarding = useCallback(async () => {
    if (!user) return;
    await supabase.from("users").update({ onboarding_completed: true }).eq("id", user.id);
    setState((s) => ({ ...s, completed: true }));
  }, [user]);

  return { ...state, refresh, markDashboardDone, completeOnboarding };
}
