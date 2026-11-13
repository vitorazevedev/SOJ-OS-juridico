import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { useAuth } from "@/features/auth/components/AuthProvider";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/lib/supabase";
import { getSupportWhatsapp, buildWaLink } from "@/lib/supportWhatsapp";

export function SupportButton() {
  const { user } = useAuth();
  const { org } = useOrganization();
  const [whatsapp, setWhatsapp] = useState<string | null>(null);

  useEffect(() => {
    getSupportWhatsapp().then(setWhatsapp);
  }, []);

  const handleClick = () => {
    if (!whatsapp) return;
    const message = `Olá! Sou da organização "${org?.name ?? ""}" (${user?.email ?? ""}) e preciso de suporte com a plataforma Ponderum.`;
    window.open(buildWaLink(whatsapp, message), "_blank");

    // Só um contador de volume pro painel Dev — não guarda o conteúdo da
    // conversa, que continua só no WhatsApp.
    supabase.from("support_clicks").insert({
      user_id: user?.id ?? null,
      org_id: org?.id ?? null,
    });
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-[calc(72px_+_env(safe-area-inset-bottom)_+_76px)] md:bottom-20 right-5 z-40 flex items-center gap-2 h-10 px-4 rounded-full bg-card border border-border text-xs font-medium shadow-lg hover:bg-muted/40 transition-all"
      title="Falar com o suporte no WhatsApp"
    >
      <MessageCircle className="h-4 w-4" />
      <span className="hidden sm:inline">Suporte</span>
    </button>
  );
}
