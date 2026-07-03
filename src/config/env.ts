const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  sentryDsn: import.meta.env.VITE_SENTRY_DSN as string | undefined,
} as const;

if (!env.supabaseUrl) throw new Error("VITE_SUPABASE_URL não configurado. Crie um .env.local");
if (!env.supabaseAnonKey) throw new Error("VITE_SUPABASE_ANON_KEY não configurado. Crie um .env.local");

export { env };
