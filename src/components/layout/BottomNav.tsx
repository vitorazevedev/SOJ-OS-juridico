import { NavLink } from "react-router-dom";
import { LayoutGrid, FileText, Bell, Sparkles, Settings } from "lucide-react";
import { useUrgentObligations } from "@/hooks/useUrgentObligations";
import { useOrganization } from "@/hooks/useOrganization";
import { cn } from "@/lib/utils";

type Item = { to: string; label: string; icon: typeof LayoutGrid; badge?: boolean; end?: boolean };
const items: Item[] = [
  { to: "/", label: "Home", icon: LayoutGrid, end: true },
  { to: "/contracts", label: "Contratos", icon: FileText },
  { to: "/obligations", label: "Tarefas", icon: Bell, badge: true },
  { to: "/generator", label: "Gerar", icon: Sparkles },
  { to: "/settings", label: "Config", icon: Settings },
];

export default function BottomNav() {
  const { count: urgentCount } = useUrgentObligations();
  const { org } = useOrganization();
  // Gerador de Contrato e Gestao de Obrigacoes sao exclusivos do Starter
  // pago -- Freemium nem ve os itens no menu.
  const isStarter = org?.plan_status === "active";
  const visibleItems = isStarter ? items : items.filter((i) => i.to !== "/obligations" && i.to !== "/generator");

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch bg-sidebar-background border-t border-sidebar-border"
      style={{
        height: "calc(72px + env(safe-area-inset-bottom))",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {visibleItems.map(({ to, label, icon: Icon, badge, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className="flex-1 relative flex flex-col items-center justify-center gap-1 active:opacity-70 transition-opacity active bg-sidebar"
          style={{ minHeight: 44, minWidth: 44 }}
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-sidebar-primary" />
              )}
              <div className="relative">
                <Icon
                  className={cn("h-5 w-5", isActive ? "text-sidebar-primary" : "text-sidebar-foreground/50")}
                />
                {badge && urgentCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center leading-none">
                    {urgentCount}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "uppercase font-semibold tracking-wide leading-none",
                  isActive ? "text-sidebar-primary" : "text-sidebar-foreground/50",
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
