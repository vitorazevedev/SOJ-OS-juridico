import { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Users, TerminalSquare, LogOut } from "lucide-react";
import { cn } from "@ponderum/ui";
import { useAuth } from "@/features/auth/components/AuthProvider";
import { useStaffRoles } from "@/hooks/useStaffRoles";
import { supabase } from "@/lib/supabase";

export default function ManagerLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { canViewEquipe, canViewDev } = useStaffRoles();
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-56 shrink-0 border-r border-border flex flex-col">
        <div className="px-4 py-5">
          <h1 className="font-cormorant text-xl font-light tracking-wider">Ponderum Manager</h1>
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
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
