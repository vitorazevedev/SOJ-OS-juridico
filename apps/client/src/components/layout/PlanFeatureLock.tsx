import { Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SojCard } from "@/components/layout/Primitives";

export function PlanFeatureLock({ feature, description }: { feature: string; description: string }) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-4 md:gap-6 max-w-[700px] mx-auto animate-fade-in">
      <SojCard className="flex flex-col items-center text-center gap-4 p-8">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
          <Lock className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">{feature} é exclusivo dos planos pagos</h2>
          <p className="text-sm text-muted-foreground mt-2">{description}</p>
        </div>
        <button
          onClick={() => navigate("/settings?tab=plan")}
          className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
        >
          Ver planos disponíveis
        </button>
      </SojCard>
    </div>
  );
}
