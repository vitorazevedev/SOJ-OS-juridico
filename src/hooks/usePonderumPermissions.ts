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
    supabase.auth.getUser().then(({ data: authData }) => {
      if (!authData.user) {
        setPerms({ ...EMPTY, loading: false });
        return;
      }
      // Filtra por id explicitamente -- a policy de RLS (org_id = get_org_id())
      // sozinha devolve TODAS as linhas da organização do chamador, não só
      // a dele, e quebra .maybeSingle() assim que a organização tem mais
      // de 1 usuário (achado ao vivo: toda organização cliente com 2+
      // usuários quebrava este hook, usado em todo o AppSidebar).
      supabase
        .from("users")
        .select("is_ponderum_staff, can_view_dev, can_view_ponderum_team, full_platform_access")
        .eq("id", authData.user.id)
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
    });
  }, []);

  return perms;
}
