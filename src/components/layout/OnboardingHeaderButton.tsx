import { ListChecks } from "lucide-react";
import { useOnboardingUI } from "@/hooks/useOnboardingUI";

export function OnboardingHeaderButton() {
  const { loading, completed, doneCount, total, reopen } = useOnboardingUI();

  if (loading || completed) return null;

  return (
    <button
      onClick={reopen}
      className="h-9 px-2.5 rounded-lg hover:bg-muted/50 flex items-center gap-1.5 text-muted-foreground transition-colors shrink-0"
      aria-label="Retomar configuração do Ponderum"
      title="Retomar configuração do Ponderum"
    >
      <div className="relative">
        <ListChecks className="h-4 w-4 text-primary" />
        <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-[hsl(var(--risk-critical))]" />
      </div>
      <span className="text-xs font-medium">{doneCount}/{total}</span>
    </button>
  );
}
