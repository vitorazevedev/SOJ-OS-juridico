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
      // Lê de staff_members (Fase 1 do Manager, 2026-11-11) -- a policy
      // staff_members_self_select só libera a própria linha (id = auth.uid()),
      // então .maybeSingle() aqui já é seguro por construção (diferente da
      // antiga leitura em `users`, que precisava do filtro por id explícito
      // pra não quebrar em organização com 2+ usuários).
      supabase
        .from("staff_members")
        .select("roles, full_platform_access")
        .eq("id", authData.user.id)
        .maybeSingle()
        .then(({ data }) => {
          const roles = data?.roles ?? [];
          setPerms({
            isStaff: !!data,
            canViewDev: roles.includes("dev"),
            canViewPonderumTeam: roles.includes("equipe"),
            fullPlatformAccess: data?.full_platform_access === true,
            loading: false,
          });
        });
    });
  }, []);

  return perms;
}
