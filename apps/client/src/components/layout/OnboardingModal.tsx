import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Check, Trophy } from "lucide-react";
import { useOnboardingUI } from "@/hooks/useOnboardingUI";
import { cn } from "@/lib/utils";

export default function OnboardingModal() {
  const { loading, completed, open, setOpen, steps, STEPS, doneCount, total, allDone, close, completeOnboarding } = useOnboardingUI();
  const navigate = useNavigate();

  if (loading || completed) return null;

  const handleStepClick = (route: string) => {
    navigate(route);
    close();
  };

  const handleFinish = async () => {
    await completeOnboarding();
    setOpen(false);
  };

  return (
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
                acompanha prazos e obrigações, tudo em um só lugar. Veja seus KPIs e atividades
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
                      <Button size="sm" variant="outline" onClick={() => handleStepClick(step.route)}>
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
  );
}
