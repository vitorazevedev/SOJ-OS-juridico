import { Lock } from "lucide-react";
import { SojCard } from "@/components/layout/Primitives";
import { useOrganization } from "@/hooks/useOrganization";

// Mesmo numero de WhatsApp comercial usado nos fluxos de upgrade/renovacao.
const SALES_WHATSAPP = "5511964889002";

export function PlanFeatureLock({ feature, description }: { feature: string; description: string }) {
  const { org } = useOrganization();

  const handleUpgradeClick = () => {
    const message = `Olá! Sou da organização "${org?.name ?? ""}" e quero fazer upgrade para o plano Starter da Ponderum para usar ${feature}.`;
    window.open(`https://wa.me/${SALES_WHATSAPP}?text=${encodeURIComponent(message)}`, "_blank");
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6 max-w-[700px] mx-auto animate-fade-in">
      <SojCard className="flex flex-col items-center text-center gap-4 p-8">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
          <Lock className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">{feature} é exclusivo do plano Starter</h2>
          <p className="text-sm text-muted-foreground mt-2">{description}</p>
        </div>
        <button
          onClick={handleUpgradeClick}
          className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
        >
          Fazer upgrade para o Starter
        </button>
      </SojCard>
    </div>
  );
}
