import { Link } from "react-router-dom";
import { Users, TerminalSquare, Wallet, ArrowRight } from "lucide-react";
import { SojCard } from "@ponderum/ui";
import { useAuth } from "@/features/auth/components/AuthProvider";
import { useStaffRoles } from "@/hooks/useStaffRoles";

const AREAS = [
  {
    url: "/equipe",
    title: "Equipe Ponderum",
    description: "Dashboard executivo, cadastro de clientes e gestão de organizações.",
    icon: Users,
  },
  {
    url: "/dev",
    title: "Dev",
    description: "Métricas, saúde do sistema, waitlist, suporte e gestão de staff.",
    icon: TerminalSquare,
  },
  {
    url: "/financeiro",
    title: "Financeiro",
    description: "Receita, repasse, pagamentos e chargebacks.",
    icon: Wallet,
  },
];

export default function Home() {
  const { user } = useAuth();
  const { canViewEquipe, canViewDev, canViewFinanceiro, loading } = useStaffRoles();
  const name = (user?.user_metadata?.name as string | undefined) ?? user?.email ?? "";

  const canView: Record<string, boolean> = {
    "/equipe": canViewEquipe,
    "/dev": canViewDev,
    "/financeiro": canViewFinanceiro,
  };
  const visibleAreas = AREAS.filter((a) => canView[a.url]);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-lg md:text-2xl font-semibold tracking-tight">Bem-vindo(a), {name}</h1>
        <p className="text-xs text-muted-foreground mt-0.5 font-mono">Ponderum Manager · Portal interno</p>
      </div>

      {!loading && visibleAreas.length === 0 && (
        <SojCard className="p-5 text-sm text-muted-foreground">
          Você ainda não tem acesso a nenhuma área interna. Fale com quem administra a equipe.
        </SojCard>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {visibleAreas.map(({ url, title, description, icon: Icon }) => (
          <Link key={url} to={url}>
            <SojCard className="flex flex-col gap-3 p-5 h-full hover:border-primary/40 transition-colors">
              <div className="flex items-center justify-between">
                <div className="h-9 w-9 rounded-xl bg-primary-dim flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">{title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
              </div>
            </SojCard>
          </Link>
        ))}
      </div>
    </div>
  );
}
