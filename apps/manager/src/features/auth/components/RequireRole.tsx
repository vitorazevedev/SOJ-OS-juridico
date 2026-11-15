import { ReactNode } from "react";
import { useStaffRoles } from "@/hooks/useStaffRoles";

export type Role = "dev" | "equipe" | "financeiro" | "owner";

// Fica dentro de StaffRoute, que já garante sessão + is_staff() + aal2 --
// aqui só falta checar o papel específico da área. A segurança de verdade
// está nas RPCs/policies (já checam has_staff_role() no banco); isto é só
// a camada de apresentação.
export default function RequireRole({ role, children }: { role: Role | Role[]; children: ReactNode }) {
  const { roles, loading } = useStaffRoles();
  const allowed = Array.isArray(role) ? role : [role];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!allowed.some((r) => roles.includes(r))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-sm text-center">
          <h1 className="text-lg font-semibold text-foreground">Acesso restrito</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Você não tem permissão para acessar esta área. Se você acredita que deveria ter
            acesso, fale com quem administra a equipe.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
