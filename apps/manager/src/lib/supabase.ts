import { createClient } from "@supabase/supabase-js";
import { env } from "@/config/env";

// Sem tipagem de Database aqui de proposito (Fase 1, mínimo) -- o manager
// ainda so usa auth + has_staff_role()/is_staff(). Tipagem completa entra
// quando as áreas de verdade (Dev/Equipe/Financeiro) migrarem nas Fases 2-4.
export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    // Códigos de backup de MFA (Fase 1b) -- recurso experimental do GoTrue,
    // precisa desse opt-in no cliente além de habilitado no projeto.
    experimental: { recoveryCodes: true },
  },
});
