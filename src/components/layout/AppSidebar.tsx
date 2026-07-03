import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  ScanSearch,
  Calendar,
  Wand2,
  Settings,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/components/AuthProvider";
import { useOrganization } from "@/hooks/useOrganization";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { TerminalSquare } from "lucide-react";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Contratos", url: "/contracts", icon: FileText },
  { title: "Análise", url: "/analysis", icon: ScanSearch },
  { title: "Obrigações", url: "/obligations", icon: Calendar },
  { title: "Gerar Contrato", url: "/generator", icon: Wand2 },
  { title: "Configurações", url: "/settings", icon: Settings },
];

const PLAN_LABELS: Record<string, string> = {
  starter: "Plano Starter",
  pro: "Plano Pro",
  enterprise: "Plano Enterprise",
};

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isActive = (url: string) => (url === "/" ? pathname === "/" : pathname.startsWith(url));
  const { user, signOut } = useAuth();
  const { org } = useOrganization();
  const isAdmin = useIsAdmin();

  const displayName = (user?.user_metadata?.name as string | undefined)?.trim() || user?.email || "Usuário";
  const planLabel = org ? (PLAN_LABELS[org.plan_id] ?? `Plano ${org.plan_id}`) : "—";

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border h-14 flex items-center justify-center px-3">
        <div className="flex items-center gap-2 w-full">
          {/* Placeholder até receber o SVG vetorizado do Fellipe */}
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <span className="font-cormorant text-xl font-semibold text-primary-foreground leading-none select-none">P</span>
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="font-cormorant text-lg font-light tracking-wider">Ponderum</span>
              <span className="text-[10px] text-muted-foreground tracking-wide">Inteligência contratual</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors",
                        isActive(item.url)
                          ? "bg-primary-dim text-primary font-medium"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/admin")} tooltip="Dev">
                    <NavLink
                      to="/admin"
                      className={cn(
                        "flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors",
                        isActive("/admin")
                          ? "bg-primary-dim text-primary font-medium"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <TerminalSquare className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>Dev</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-primary-dim text-primary flex items-center justify-center text-xs font-semibold shrink-0">
              {initialsFor(displayName)}
            </div>
            <div className="flex flex-col leading-tight min-w-0 flex-1">
              <span className="text-xs font-medium truncate">{displayName}</span>
              <span className="text-[10px] text-muted-foreground truncate">{planLabel}</span>
            </div>
            <button
              onClick={handleSignOut}
              title="Sair"
              className="h-8 w-8 shrink-0 rounded-md flex items-center justify-center text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-primary-dim text-primary flex items-center justify-center text-xs font-semibold">
              {initialsFor(displayName)}
            </div>
            <button
              onClick={handleSignOut}
              title="Sair"
              className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
