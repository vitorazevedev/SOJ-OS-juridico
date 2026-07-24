import { useNavigate } from "react-router-dom";
import { useIsPonderumStaff } from "@/hooks/useIsPonderumStaff";
import { CreateStarterUserForm } from "@/components/admin/CreateStarterUserForm";

export default function PonderumTeam() {
  const navigate = useNavigate();
  const isPonderumStaff = useIsPonderumStaff();

  if (!isPonderumStaff) return (
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

      <CreateStarterUserForm />
    </div>
  );
}
