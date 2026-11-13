import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

const IDLE_LIMIT_MS = 30 * 60 * 1000;
const ACTIVITY_EVENTS = ["mousemove", "keydown", "click", "scroll", "touchstart"] as const;

// Sessao do manager e mais curta que a do app do cliente (docs/MANAGER_SPEC.md,
// secao 2): desloga sozinho apos 30 min sem nenhuma interacao.
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
