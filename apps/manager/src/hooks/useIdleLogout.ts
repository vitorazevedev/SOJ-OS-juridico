import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

const IDLE_LIMIT_MS = 4 * 60 * 60 * 1000;
const ACTIVITY_EVENTS = ["mousemove", "keydown", "click", "scroll", "touchstart"] as const;

// Sessao do manager e mais curta que a do app do cliente (docs/MANAGER_SPEC.md,
// secao 2): desloga sozinho apos um tempo sem nenhuma interacao. Era 30 min,
// mas isso disparava relogin (senha + 2FA) toda vez que a equipe passava um
// tempo sem tocar na aba (ex.: enquanto um processo roda em segundo plano) --
// ajustado pra 4h (2026-11-16) depois de feedback real de uso.
export function useIdleLogout(active: boolean) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!active) return;

    const reset = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        supabase.auth.signOut();
      }, IDLE_LIMIT_MS);
    };

    reset();
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, reset, { passive: true }));

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, reset));
    };
  }, [active]);
}
