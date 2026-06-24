import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  ScanSearch,
  Calendar,
  Wand2,
  Settings,
  Scale,
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

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Contratos", url: "/contracts", icon: FileText },
  { title: "Análise", url: "/analysis", icon: ScanSearch },
  { title: "Obrigações", url: "/obligations", icon: Calendar },
  { title: "Gerar Contrato", url: "/generator", icon: Wand2 },
  { title: "Configurações", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const isActive = (url: string) => (url === "/" ? pathname === "/" : pathname.startsWith(url));

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border h-14 flex items-center justify-center px-3">
        <div className="flex items-center gap-2 w-full">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Scale className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-tight">SOJ</span>
              <span className="text-[10px] text-muted-foreground">Sócio Jurídico IA</span>
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
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary-dim text-primary flex items-center justify-center text-xs font-semibold">
              VB
            </div>
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-xs font-medium truncate">Vitor Bertão</span>
              <span className="text-[10px] text-muted-foreground truncate">Plano Pro</span>
            </div>
          </div>
        ) : (
          <div className="h-9 w-9 mx-auto rounded-full bg-primary-dim text-primary flex items-center justify-center text-xs font-semibold">
            VB
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
