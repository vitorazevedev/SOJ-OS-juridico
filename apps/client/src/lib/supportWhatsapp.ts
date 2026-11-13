import { supabase } from "@/lib/supabase";

// Mesmo número usado pelo botão flutuante de suporte (SupportButton) --
// configurável em app_settings.support_whatsapp (ver SupportChannelCard).
const FALLBACK_WHATSAPP = "5511964889002";

export async function getSupportWhatsapp(): Promise<string> {
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "support_whatsapp")
    .maybeSingle();
  return data?.value ?? FALLBACK_WHATSAPP;
}

export function buildWaLink(number: string, message: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
