import { MessageCircle } from "lucide-react";
import { useAuth } from "@/features/auth/components/AuthProvider";
import { useOrganization } from "@/hooks/useOrganization";

// Mesmo numero de WhatsApp comercial usado nos fluxos de upgrade/renovacao.
const SUPPORT_WHATSAPP = "5511964889002";

export function SupportButton() {
  const { user } = useAuth();
  const { org } = useOrganization();

  const handleClick = () => {
    const message = `Olá! Sou da organização "${org?.name ?? ""}" (${user?.email ?? ""}) e preciso de suporte com a plataforma Ponderum.`;
    window.open(`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(message)}`, "_blank");
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-20 right-5 z-50 flex items-center gap-2 h-10 px-4 rounded-full bg-card border border-border text-xs font-medium shadow-lg hover:bg-muted/40 transition-all"
      title="Falar com o suporte no WhatsApp"
    >
      <MessageCircle className="h-4 w-4" />
      <span className="hidden sm:inline">Suporte</span>
    </button>
  );
}
