import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type StaffRoles = {
  roles: string[];
  fullPlatformAccess: boolean;
  isStaff: boolean;
  canViewEquipe: boolean;
  canViewDev: boolean;
  canViewFinanceiro: boolean;
  loading: boolean;
};

const EMPTY: StaffRoles = {
  roles: [],
  fullPlatformAccess: false,
  isStaff: false,
  canViewEquipe: false,
  canViewDev: false,
  canViewFinanceiro: false,
  loading: true,
};

export function useStaffRoles(): StaffRoles {
  const [state, setState] = useState<StaffRoles>(EMPTY);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: authData }) => {
      if (!authData.user) {
        setState({ ...EMPTY, loading: false });
        return;
      }
      // Mesma leitura de staff_members do usePonderumPermissions do client --
      // a policy staff_members_self_select só libera a própria linha.
      supabase
        .from("staff_members")
        .select("roles, full_platform_access")
        .eq("id", authData.user.id)
        .maybeSingle()
        .then(({ data }) => {
          const roles = data?.roles ?? [];
          // full_platform_access NÃO é bypass de área interna -- significa
          // "esse staff também acessa o app como cliente comum" (rótulo em
          // PonderumStaffManagement: "Acesso completo à plataforma (como
          // cliente)"). O acesso a /dev, /equipe, /financeiro depende só do
          // papel em `roles`, igual o banco já checa em has_staff_role().
          const fullPlatformAccess = data?.full_platform_access === true;
          setState({
            roles,
            fullPlatformAccess,
            isStaff: !!data,
            canViewEquipe: roles.includes("equipe"),
            canViewDev: roles.includes("dev"),
            canViewFinanceiro: roles.includes("financeiro"),
            loading: false,
          });
        });
    });
  }, []);

  return state;
}
