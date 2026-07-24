import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Check, ListChecks, Trophy } from "lucide-react";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useAuth } from "@/features/auth/components/AuthProvider";
import { cn } from "@/lib/utils";

interface StepDef {
  key: "organization" | "contractUpload" | "contractGenerated";
  emoji: string;
  title: string;
  description: string;
  cta: string;
  route: string;
}

const BASE_STEPS: StepDef[] = [
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

const GENERATE_STEP: StepDef = {
  key: "contractGenerated",
  emoji: "⚡",
  title: "Gere seu primeiro contrato",
  description: "Use nossos templates prontos: NDA, Serviços, SaaS e mais",
  cta: "Gerar Contrato",
  route: "/generator",
};

const DISMISSED_KEY = "soj_onboarding_dismissed";

export default function OnboardingModal() {
  const { user } = useAuth();
  const { loading, completed, planStatus, steps, completeOnboarding, refresh } = useOnboarding();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissedState] = useState(false);

  // "Fechar" some até o usuário reabrir pelo botão flutuante — mesmo depois
  // de dar refresh na página, pra não ficar reaparecendo sozinho toda hora.
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

  if (loading || completed) return null;

  const reopen = () => {
    setDismissed(false);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setDismissed(true);
  };

  const handleStepClick = (step: StepDef) => {
    navigate(step.route);
    close();
  };

  const handleFinish = async () => {
    await completeOnboarding();
    setOpen(false);
  };

  return (
    <>
    {dismissed && !open && (
      <button
        onClick={reopen}
        className="fixed bottom-[calc(80px+env(safe-area-inset-bottom)+8px)] right-4 md:bottom-6 md:right-6 z-40 flex items-center gap-2 h-10 pl-3 pr-4 rounded-full bg-background border border-border shadow-lg hover:bg-muted/40 transition-colors"
        aria-label="Retomar configuração do Ponderum"
      >
        <div className="relative">
          <ListChecks className="h-4 w-4 text-primary" />
          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-[hsl(var(--risk-critical))]" />
        </div>
        <span className="text-xs font-medium">{doneCount}/{total} passos</span>
      </button>
    )}
    <Dialog open={open} onOpenChange={(v) => { if (!v) close(); else setOpen(v); }}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden gap-0">
        {allDone ? (
          <div className="p-8 text-center space-y-5">
            <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Trophy className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold">Configuração concluída!</h2>
              <p className="text-muted-foreground mt-2">
                Seu ambiente jurídico está pronto. Bom trabalho!
              </p>
            </div>
            <Button size="lg" onClick={handleFinish} className="w-full sm:w-auto">
              Começar a usar o Ponderum
            </Button>
          </div>
        ) : (
          <>
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-semibold">Bem-vindo ao Ponderum!</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Siga os passos abaixo para configurar seu ambiente jurídico
              </p>
              <p className="text-sm text-muted-foreground mt-3">
                Aqui você organiza seus contratos, recebe uma análise jurídica completa por IA e
                acompanha prazos e obrigações — tudo em um só lugar. Veja seus KPIs e atividades
                recentes a qualquer momento no{" "}
                <button onClick={() => { navigate("/"); close(); }} className="text-primary hover:underline">
                  Dashboard
                </button>.
              </p>
              <div className="mt-4 flex items-center gap-3">
                <Progress value={(doneCount / total) * 100} className="flex-1" />
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {doneCount} de {total}
                </span>
              </div>
            </div>

            <div className="p-4 max-h-[55vh] overflow-y-auto space-y-2">
              {STEPS.map((step) => {
                const done = steps[step.key];
                return (
                  <div
                    key={step.key}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border border-border transition-colors",
                      done ? "bg-muted/30" : "hover:bg-muted/20"
                    )}
                  >
                    <div
                      className={cn(
                        "mt-0.5 h-5 w-5 rounded-md border flex items-center justify-center shrink-0",
                        done
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-border"
                      )}
                    >
                      {done && <Check className="h-3.5 w-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className={cn(
                          "font-medium text-sm flex items-center gap-2",
                          done && "line-through text-muted-foreground"
                        )}
                      >
                        <span>{step.emoji}</span>
                        <span>{step.title}</span>
                      </div>
                      <p
                        className={cn(
                          "text-xs text-muted-foreground mt-0.5",
                          done && "line-through"
                        )}
                      >
                        {step.description}
                      </p>
                    </div>
                    {!done && (
                      <Button size="sm" variant="outline" onClick={() => handleStepClick(step)}>
                        {step.cta}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-border flex justify-end">
              <Button variant="ghost" size="sm" onClick={close}>
                Fazer isso depois
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}
