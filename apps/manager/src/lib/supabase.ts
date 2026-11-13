import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { env } from "@/config/env";

export const supabase = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    // Códigos de backup de MFA (Fase 1b) -- recurso experimental do GoTrue,
    // precisa desse opt-in no cliente além de habilitado no projeto.
    experimental: { recoveryCodes: true },
  },
});
