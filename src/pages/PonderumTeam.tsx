import { useNavigate } from "react-router-dom";
import { usePonderumPermissions } from "@/hooks/usePonderumPermissions";
import { CreateStarterUserForm } from "@/components/admin/CreateStarterUserForm";
import { OrganizationsManagementList } from "@/components/admin/OrganizationsManagementList";
import { ExecutiveDashboard } from "@/components/admin/ExecutiveDashboard";

export default function PonderumTeam() {
  const navigate = useNavigate();
  const { canViewPonderumTeam } = usePonderumPermissions();

  if (!canViewPonderumTeam) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <p className="text-sm text-muted-foreground">Acesso restrito.</p>
      <button onClick={() => navigate("/")} className="text-xs text-primary underline">Voltar</button>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-lg md:text-2xl font-semibold tracking-tight">Equipe Ponderum</h1>
        <p className="text-xs text-muted-foreground mt-0.5 font-mono">Ponderum · Visão interna</p>
      </div>

      <ExecutiveDashboard />
      <CreateStarterUserForm />
      <OrganizationsManagementList />
    </div>
  );
}
