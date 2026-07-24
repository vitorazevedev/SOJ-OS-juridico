import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type PonderumPermissions = {
  isStaff: boolean;
  canViewDev: boolean;
  canViewPonderumTeam: boolean;
  fullPlatformAccess: boolean;
  loading: boolean;
};

const EMPTY: PonderumPermissions = {
  isStaff: false,
  canViewDev: false,
  canViewPonderumTeam: false,
  fullPlatformAccess: false,
  loading: true,
};

export function usePonderumPermissions(): PonderumPermissions {
  const [perms, setPerms] = useState<PonderumPermissions>(EMPTY);

  useEffect(() => {
    supabase
      .from("users")
      .select("is_ponderum_staff, can_view_dev, can_view_ponderum_team, full_platform_access")
      .maybeSingle()
      .then(({ data }) => {
        setPerms({
          isStaff: data?.is_ponderum_staff === true,
          canViewDev: data?.can_view_dev === true,
          canViewPonderumTeam: data?.can_view_ponderum_team === true,
          fullPlatformAccess: data?.full_platform_access === true,
          loading: false,
        });
      });
  }, []);

  return perms;
}
