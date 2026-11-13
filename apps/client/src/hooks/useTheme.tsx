import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/components/AuthProvider";

type Theme = "dark" | "light";

const STORAGE_KEY = "ponderum-theme";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  setTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("light", theme === "light");
}

function readStoredTheme(): Theme {
  try {
    return localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);
  const syncedForUser = useRef<string | null>(null);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Sincroniza com a preferência salva no user_metadata (ex: login em outro dispositivo),
  // uma única vez por usuário logado.
  useEffect(() => {
    if (!user || syncedForUser.current === user.id) return;
    syncedForUser.current = user.id;
    const remote = user.user_metadata?.theme_preference;
    if ((remote === "light" || remote === "dark") && remote !== theme) {
      setThemeState(remote);
      try {
        localStorage.setItem(STORAGE_KEY, remote);
      } catch {
        // ignore
      }
    }
  }, [user, theme]);

  const setTheme = (next: Theme) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
    if (user) {
      supabase.auth.updateUser({ data: { theme_preference: next } });
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
