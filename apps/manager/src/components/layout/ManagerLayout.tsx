import { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, Users, TerminalSquare, Wallet, LogOut, Tag } from "lucide-react";
import { cn } from "@ponderum/ui";
import { useAuth } from "@/features/auth/components/AuthProvider";
import { useStaffRoles } from "@/hooks/useStaffRoles";
import { supabase } from "@/lib/supabase";
import ManagerBottomNav from "./ManagerBottomNav";

export default function ManagerLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { roles, canViewEquipe, canViewDev, canViewFinanceiro } = useStaffRoles();
  const isOwner = roles.includes("owner");
  const canViewFinanceiroArea = canViewFinanceiro || isOwner;
  const canViewCupons = canViewFinanceiroArea || canViewEquipe;
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden md:flex w-56 shrink-0 border-r border-border flex-col">
        <div className="px-4 py-5 flex items-center gap-2.5">
          <img src="/ponderum-icon-white.png" alt="Ponderum" className="h-8 w-8 shrink-0 object-contain" />
          <div className="flex flex-col leading-tight">
            <span className="font-cormorant text-lg font-light tracking-wider">Ponderum</span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-primary">Manager</span>
          </div>
        </div>
        <nav className="flex-1 px-2 flex flex-col gap-1">
          <NavLink
            to="/"
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
              isActive("/")
                ? "bg-primary-dim text-primary font-medium"
                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
            )}
          >
            <Home className="h-4 w-4 shrink-0" />
            Início
          </NavLink>
          {canViewEquipe && (
            <NavLink
              to="/equipe"
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                isActive("/equipe")
                  ? "bg-primary-dim text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
              )}
            >
              <Users className="h-4 w-4 shrink-0" />
              Equipe Ponderum
            </NavLink>
          )}
          {canViewDev && (
            <NavLink
              to="/dev"
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                isActive("/dev")
                  ? "bg-primary-dim text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
              )}
            >
              <TerminalSquare className="h-4 w-4 shrink-0" />
              Dev
            </NavLink>
          )}
          {canViewFinanceiroArea && (
            <NavLink
              to="/financeiro"
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                isActive("/financeiro")
                  ? "bg-primary-dim text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
              )}
            >
              <Wallet className="h-4 w-4 shrink-0" />
              Financeiro
            </NavLink>
          )}
          {canViewCupons && (
            <NavLink
              to="/cupons"
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                isActive("/cupons")
                  ? "bg-primary-dim text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
              )}
            >
              <Tag className="h-4 w-4 shrink-0" />
              Cupons
            </NavLink>
          )}
        </nav>
        <div className="px-2 py-3 border-t border-border flex flex-col gap-1">
          <p className="px-2.5 text-xs text-muted-foreground truncate">{user?.email}</p>
          <button
            onClick={() => supabase.auth.signOut()}
            className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sair
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="md:hidden flex h-14 border-b border-border items-center justify-between px-4 sticky top-0 bg-background/80 backdrop-blur z-10">
          <div className="flex items-center gap-2">
            <img src="/ponderum-icon-white.png" alt="Ponderum" className="h-5 w-5 object-contain" />
            <span className="text-sm font-semibold">Ponderum Manager</span>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="h-9 w-9 rounded-lg hover:bg-muted/50 flex items-center justify-center text-muted-foreground transition-colors"
            aria-label="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </header>

        <main className="flex-1 min-w-0 pb-[calc(72px+env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </main>
      </div>

      <ManagerBottomNav
        canViewEquipe={canViewEquipe}
        canViewDev={canViewDev}
        canViewFinanceiroArea={canViewFinanceiroArea}
        canViewCupons={canViewCupons}
      />
    </div>
  );
}
