import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useAuth } from "@/features/auth/components/AuthProvider";

export type OnboardingStepDef = {
  key: "organization" | "contractUpload" | "contractGenerated";
  emoji: string;
  title: string;
  description: string;
  cta: string;
  route: string;
};

const BASE_STEPS: OnboardingStepDef[] = [
  {
    key: "organization",
    emoji: "🏢",
    title: "Complete o perfil da organização",
    description: "Adicione nome, CNPJ, setor e logo da sua empresa",
    cta: "Ir para Configurações",
    route: "/settings",
  },
  {
    key: "contractUpload",
    emoji: "📄",
    title: "Faça upload do seu primeiro contrato",
    description: "Envie um PDF ou DOCX para análise",
    cta: "Ir para Contratos",
    route: "/contracts",
  },
];

const GENERATE_STEP: OnboardingStepDef = {
  key: "contractGenerated",
  emoji: "⚡",
  title: "Gere seu primeiro contrato",
  description: "Use nossos templates prontos: NDA, Serviços, SaaS e mais",
  cta: "Gerar Contrato",
  route: "/generator",
};

const DISMISSED_KEY = "soj_onboarding_dismissed";

type OnboardingUIValue = {
  loading: boolean;
  completed: boolean;
  open: boolean;
  setOpen: (v: boolean) => void;
  steps: ReturnType<typeof useOnboarding>["steps"];
  STEPS: OnboardingStepDef[];
  doneCount: number;
  total: number;
  allDone: boolean;
  reopen: () => void;
  close: () => void;
  completeOnboarding: () => Promise<void>;
};

const OnboardingUIContext = createContext<OnboardingUIValue | null>(null);

export function OnboardingUIProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { loading, completed, planStatus, steps, completeOnboarding, refresh } = useOnboarding();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissedState] = useState(false);

  // "Fechar" some até o usuário reabrir pelo botão do cabeçalho — mesmo
  // depois de dar refresh na página, pra não ficar reaparecendo sozinho.
  useEffect(() => {
    if (!user) return;
    setDismissedState(window.localStorage.getItem(`${DISMISSED_KEY}_${user.id}`) === "1");
  }, [user]);

  const setDismissed = (v: boolean) => {
    setDismissedState(v);
    if (!user) return;
    if (v) window.localStorage.setItem(`${DISMISSED_KEY}_${user.id}`, "1");
    else window.localStorage.removeItem(`${DISMISSED_KEY}_${user.id}`);
  };

  useEffect(() => {
    if (!loading && !completed && !dismissed) {
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // "Gerar contrato" só existe pro plano Starter pago — Freemium não vê
  // esse passo, pra não anunciar uma função que ele não tem acesso.
  const STEPS = planStatus === "active" ? [...BASE_STEPS, GENERATE_STEP] : BASE_STEPS;
  const doneCount = STEPS.filter((s) => steps[s.key]).length;
  const total = STEPS.length;
  const allDone = doneCount === total;

  useEffect(() => {
    if (loading) return;
    if (completed) {
      setOpen(false);
      return;
    }
    // Sempre volta a aparecer quando os passos são concluídos, mesmo que
    // tenha sido fechado antes — pra mostrar a tela de conclusão.
    if (allDone || !dismissed) setOpen(true);
  }, [loading, completed, dismissed, allDone]);

  const reopen = () => {
    setDismissed(false);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setDismissed(true);
  };

  return (
    <OnboardingUIContext.Provider
      value={{ loading, completed, open, setOpen, steps, STEPS, doneCount, total, allDone, reopen, close, completeOnboarding }}
    >
      {children}
    </OnboardingUIContext.Provider>
  );
}

export function useOnboardingUI(): OnboardingUIValue {
  const ctx = useContext(OnboardingUIContext);
  if (!ctx) throw new Error("useOnboardingUI must be used within OnboardingUIProvider");
  return ctx;
}
