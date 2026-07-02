import { useEffect, useRef, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import BottomNav from "./BottomNav";
import OnboardingModal from "./OnboardingModal";
import { SearchPanel } from "./SearchPanel";
import { Bell, CalendarClock, Scale, Search, X } from "lucide-react";
import { UrgentObligationsContext, useUrgentObligationsProvider } from "@/hooks/useUrgentObligations";
import { useGlobalSearch } from "@/hooks/useGlobalSearch";
import { cn } from "@/lib/utils";

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/contracts": "Contratos",
  "/obligations": "Obrigações",
  "/generator": "Gerar Contrato",
  "/settings": "Configurações",
};

function useMobileTitle(): string {
  const { pathname } = useLocation();
  if (pathname in PAGE_TITLES) return PAGE_TITLES[pathname];
  if (pathname.startsWith("/analysis")) return "Análise";
  if (pathname.startsWith("/contracts")) return "Contratos";
  return "Ponderum";
}

function daysLabel(dateStr: string) {
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff <= 0) return "Hoje";
  if (diff === 1) return "Amanhã";
  return `${diff}d`;
}

// Reusable notifications dropdown content
function NotificationsDropdown({
  count,
  obligations,
  onNavigate,
  onClose,
}: {
  count: number;
  obligations: ReturnType<typeof useUrgentObligationsProvider>["obligations"];
  onNavigate: () => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute right-0 top-11 z-50 w-80 rounded-xl border border-border bg-popover shadow-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Obrigações urgentes</span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      {count === 0 && obligations.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">Nenhuma obrigação vencendo em 30 dias</p>
        </div>
      ) : (
        <div className="divide-y divide-border max-h-72 overflow-y-auto">
          {obligations.map((o) => {
            const days = o.days_remaining;
            return (
              <button
                key={o.id}
                onClick={onNavigate}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm truncate">{o.description}</p>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">{o.contract_name ?? "—"}</p>
                </div>
                <span className={cn(
                  "shrink-0 text-xs font-semibold tabular-nums px-2 py-0.5 rounded-full",
                  days <= 1
                    ? "bg-[hsl(var(--risk-critical))] text-background"
                    : days <= 7
                    ? "bg-[hsl(var(--risk-medium))] text-background"
                    : days <= 15
                    ? "bg-yellow-500 text-background"
                    : "bg-[hsl(var(--info))] text-background"
                )}>
                  {daysLabel(o.due_date)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="border-t border-border px-4 py-2.5">
        <button onClick={onNavigate} className="text-xs text-primary hover:underline">
          Ver todas as obrigações →
        </button>
      </div>
    </div>
  );
}

export default function AppLayout() {
  const navigate = useNavigate();
  const urgentCtx = useUrgentObligationsProvider();
  const [panelOpen, setPanelOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const { obligations, count } = urgentCtx;
  const showBanner = count > 0 && !bannerDismissed;
  const mobileTitle = useMobileTitle();

  const panelRef = useRef<HTMLDivElement>(null);
  const mobilePanelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);

  const search = useGlobalSearch();
  const searchOpen = search.query.trim().length >= 2;

  // Keep a stable ref to clear() so effects don't need search in their deps
  const clearSearchRef = useRef(search.clear);
  useEffect(() => { clearSearchRef.current = search.clear; }, [search.clear]);

  // Close notifications on outside click
  useEffect(() => {
    if (!panelOpen) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (!panelRef.current?.contains(target) && !mobilePanelRef.current?.contains(target)) {
        setPanelOpen(false);
      }
    }
    const id = setTimeout(() => document.addEventListener("mousedown", handleClick), 0);
    return () => { clearTimeout(id); document.removeEventListener("mousedown", handleClick); };
  }, [panelOpen]);

  // Close search panel on outside click — depends only on searchOpen, not search object
  useEffect(() => {
    if (!searchOpen) return;
    function handleClick(e: MouseEvent) {
      if (!searchRef.current?.contains(e.target as Node)) clearSearchRef.current();
    }
    const id = setTimeout(() => document.addEventListener("mousedown", handleClick), 0);
    return () => { clearTimeout(id); document.removeEventListener("mousedown", handleClick); };
  }, [searchOpen]);

  // Keyboard shortcuts — mounted once, reads stable refs
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.key === "/" || (e.metaKey && e.key === "k") || (e.ctrlKey && e.key === "k")) && !e.shiftKey) {
        const tag = (document.activeElement as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
        const input = searchRef.current?.querySelector("input");
        if (input) input.focus();
      }
      if (e.key === "Escape") { clearSearchRef.current(); setMobileSearchOpen(false); }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  // Focus mobile search input when overlay opens; clear when it closes
  useEffect(() => {
    if (mobileSearchOpen) {
      setTimeout(() => mobileSearchRef.current?.focus(), 50);
    } else {
      clearSearchRef.current();
    }
  }, [mobileSearchOpen]);

  const goObligations = () => { navigate("/obligations"); setPanelOpen(false); };

  return (
    <UrgentObligationsContext.Provider value={urgentCtx}>
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <div className="hidden md:flex">
          <AppSidebar />
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile header */}
          <header className="md:hidden flex h-14 border-b border-border items-center justify-between px-4 sticky top-0 bg-background/80 backdrop-blur z-10">
            {mobileSearchOpen ? (
              /* Mobile search overlay */
              <div className="flex items-center gap-2 flex-1 relative" ref={searchRef as React.RefObject<HTMLDivElement>}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  ref={mobileSearchRef}
                  value={search.query}
                  onChange={(e) => search.setQuery(e.target.value)}
                  placeholder="Buscar contratos, obrigações…"
                  className="flex-1 h-9 pl-9 pr-3 rounded-lg bg-muted/40 border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-colors"
                />
                {searchOpen && (
                  <SearchPanel
                    query={search.query}
                    results={search.results}
                    loading={search.loading}
                    onClose={() => setMobileSearchOpen(false)}
                  />
                )}
                <button
                  onClick={() => setMobileSearchOpen(false)}
                  className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Scale className="h-5 w-5 text-primary" />
                  <span className="text-sm font-semibold">{mobileTitle}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setMobileSearchOpen(true)}
                    className="h-9 w-9 rounded-lg hover:bg-muted/50 flex items-center justify-center text-muted-foreground transition-colors"
                    aria-label="Buscar"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                  <div className="relative" ref={mobilePanelRef}>
                    <button
                      onClick={() => setPanelOpen((v) => !v)}
                      className="h-9 w-9 rounded-lg hover:bg-muted/50 flex items-center justify-center text-muted-foreground transition-colors relative"
                    >
                      <Bell className="h-4 w-4" />
                      {count > 0 && (
                        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[hsl(var(--risk-critical))]" />
                      )}
                    </button>
                    {panelOpen && (
                      <NotificationsDropdown
                        count={count}
                        obligations={obligations}
                        onNavigate={goObligations}
                        onClose={() => setPanelOpen(false)}
                      />
                    )}
                  </div>
                </div>
              </>
            )}
          </header>

          {/* Desktop header */}
          <header className="hidden md:flex h-14 border-b border-border items-center gap-3 px-4 sticky top-0 bg-background/80 backdrop-blur z-10">
            <SidebarTrigger />
            <div className="flex-1 max-w-md relative" ref={searchRef}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                value={search.query}
                onChange={(e) => search.setQuery(e.target.value)}
                placeholder="Buscar contratos, obrigações… (/ ou Ctrl+K)"
                className="w-full h-9 pl-9 pr-3 rounded-lg bg-muted/40 border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-colors"
              />
              {searchOpen && (
                <SearchPanel
                  query={search.query}
                  results={search.results}
                  loading={search.loading}
                  onClose={search.clear}
                />
              )}
            </div>

            <div className="relative" ref={panelRef}>
              <button
                onClick={() => setPanelOpen((v) => !v)}
                className="h-9 w-9 rounded-lg hover:bg-muted/50 flex items-center justify-center text-muted-foreground transition-colors relative"
              >
                <Bell className="h-4 w-4" />
                {count > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[hsl(var(--risk-critical))]" />
                )}
              </button>
              {panelOpen && (
                <NotificationsDropdown
                  count={count}
                  obligations={obligations}
                  onNavigate={goObligations}
                  onClose={() => setPanelOpen(false)}
                />
              )}
            </div>
          </header>

          {showBanner && (
            <div className="hidden md:flex items-center justify-between gap-3 px-6 py-2.5 border-b border-border"
              style={{ background: "hsl(var(--risk-critical) / 0.12)" }}>
              <div className="flex items-center gap-2 text-sm" style={{ color: "hsl(var(--risk-critical))" }}>
                <CalendarClock className="h-4 w-4 shrink-0" />
                <span className="font-medium">
                  {count} {count > 1 ? "obrigações" : "obrigação"} vencendo em até 7 dias
                </span>
                <button
                  onClick={() => navigate("/obligations")}
                  className="ml-1 underline underline-offset-2 hover:opacity-80 transition-opacity"
                >
                  Ver agora
                </button>
              </div>
              <button onClick={() => setBannerDismissed(true)} style={{ color: "hsl(var(--risk-critical))", opacity: 0.7 }}>
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <main
            className="flex-1 px-4 py-4 md:p-6 lg:p-8 overflow-x-hidden"
            style={{ paddingBottom: "calc(80px + env(safe-area-inset-bottom))" }}
          >
            <Outlet />
          </main>
        </div>

        <BottomNav />
        <OnboardingModal />
      </div>
    </SidebarProvider>
    </UrgentObligationsContext.Provider>
  );
}
