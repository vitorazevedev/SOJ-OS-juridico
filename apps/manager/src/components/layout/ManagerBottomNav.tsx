import { NavLink } from "react-router-dom";
import { Home, Users, TerminalSquare, Wallet, Tag } from "lucide-react";
import { cn } from "@ponderum/ui";

type Item = { to: string; label: string; icon: typeof Home; end?: boolean };

// Mesmo padrao do BottomNav do apps/client -- a sidebar fixa (w-56) nao
// cabe num telefone, sobrando pouco espaco pros cards (ver print do
// Vitor, 2026-11-25). Itens visiveis dependem do papel, igual a sidebar
// de desktop (ManagerLayout.tsx).
export default function ManagerBottomNav({
  canViewEquipe,
  canViewDev,
  canViewFinanceiroArea,
  canViewCupons,
}: {
  canViewEquipe: boolean;
  canViewDev: boolean;
  canViewFinanceiroArea: boolean;
  canViewCupons: boolean;
}) {
  const items: Item[] = [
    { to: "/", label: "Início", icon: Home, end: true },
    ...(canViewEquipe ? [{ to: "/equipe", label: "Equipe", icon: Users }] : []),
    ...(canViewDev ? [{ to: "/dev", label: "Dev", icon: TerminalSquare }] : []),
    ...(canViewFinanceiroArea ? [{ to: "/financeiro", label: "Financeiro", icon: Wallet }] : []),
    ...(canViewCupons ? [{ to: "/cupons", label: "Cupons", icon: Tag }] : []),
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch bg-background border-t border-border"
      style={{
        height: "calc(64px + env(safe-area-inset-bottom))",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className="flex-1 relative flex flex-col items-center justify-center gap-1 active:opacity-70 transition-opacity"
          style={{ minHeight: 44, minWidth: 44 }}
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-primary" />
              )}
              <Icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")} />
              <span
                className={cn(
                  "uppercase font-semibold tracking-wide leading-none",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
                style={{ fontSize: 9 }}
              >
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
