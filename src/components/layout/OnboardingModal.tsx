import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Check, ListChecks, Trophy } from "lucide-react";
import { useOnboarding } from "@/hooks/useOnboarding";
import { cn } from "@/lib/utils";

interface StepDef {
  key: keyof ReturnType<typeof useOnboarding>["steps"];
  emoji: string;
  title: string;
  description: string;
  cta: string;
  route?: string;
  onClick?: (ctx: { markDashboardDone: () => void; close: () => void }) => void;
}

const STEPS: StepDef[] = [
  {
    key: "dashboard",
    emoji: "✅",
    title: "Conheça o Dashboard",
    description: "Veja seus KPIs, contratos e obrigações em tempo real",
    cta: "Ver Dashboard",
    route: "/",
    onClick: ({ markDashboardDone, close }) => {
      markDashboardDone();
      close();
    },
  },
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
  {
    key: "contractGenerated",
    emoji: "⚡",
    title: "Gere seu primeiro contrato",
    description: "Use nossos templates prontos: NDA, Serviços, SaaS e mais",
    cta: "Gerar Contrato",
    route: "/generator",
  },
];

export default function OnboardingModal() {
  const { loading, completed, steps, markDashboardDone, completeOnboarding, refresh } =
    useOnboarding();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!loading && !completed && !dismissed) {
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    if (loading) return;
    if (completed) {
      setOpen(false);
      return;
    }
    if (!dismissed) setOpen(true);
  }, [loading, completed, dismissed]);

  if (loading || completed) return null;

  const reopen = () => {
    setDismissed(false);
    setOpen(true);
  };

  const doneCount = Object.values(steps).filter(Boolean).length;
  const total = STEPS.length;
  const allDone = doneCount === total;

  const close = () => {
    setOpen(false);
    setDismissed(true);
  };

  const handleStepClick = (step: StepDef) => {
    if (step.onClick) {
      step.onClick({ markDashboardDone, close });
      if (step.route) navigate(step.route);
      return;
    }
    if (step.route) {
      navigate(step.route);
      close();
    }
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
        aria-label="Retomar configuração do SOJ"
      >
        <div className="relative">
          <ListChecks className="h-4 w-4 text-primary" />
          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-[hsl(var(--risk-critical))]" />
        </div>
        <span className="text-xs font-medium">{doneCount}/{total} passos</span>
      </button>
    )}
    <Dialog open={open} onOpenChange={(v) => { if (!v) setDismissed(true); setOpen(v); }}>
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
              Começar a usar o SOJ
            </Button>
          </div>
        ) : (
          <>
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-semibold">Bem-vindo ao SOJ! 👋</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Siga os passos abaixo para configurar seu ambiente jurídico
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
