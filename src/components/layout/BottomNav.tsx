import { NavLink } from "react-router-dom";
import { LayoutGrid, FileText, Bell, Sparkles, Settings } from "lucide-react";
import { useUrgentObligations } from "@/hooks/useUrgentObligations";
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

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch"
      style={{
        background: "#0a0d1a",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        height: "calc(72px + env(safe-area-inset-bottom))",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {items.map(({ to, label, icon: Icon, badge, end }) => (
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
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full"
                  style={{ background: "#00e5a0" }}
                />
              )}
              <div className="relative">
                <Icon
                  className="h-5 w-5"
                  style={{ color: isActive ? "#00e5a0" : "rgba(255,255,255,0.35)" }}
                />
                {badge && urgentCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-[#ff3b30] text-white text-[9px] font-bold flex items-center justify-center leading-none">
                    {urgentCount}
                  </span>
                )}
              </div>
              <span
                className={cn("uppercase font-semibold tracking-wide leading-none")}
                style={{
                  fontSize: 9,
                  color: isActive ? "#00e5a0" : "rgba(255,255,255,0.35)",
                }}
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
