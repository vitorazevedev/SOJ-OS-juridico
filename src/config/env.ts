const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  sentryDsn: import.meta.env.VITE_SENTRY_DSN as string | undefined,
  sentryProjectUrl: import.meta.env.VITE_SENTRY_PROJECT_URL as string | undefined,
  // Modulo de Pagamentos, Fase 6 -- public key do Mercado Pago, usada pelo
  // CardBrick real (tokeniza cartao no navegador). So o front le isso --
  // o Access Token (privado) fica so nos secrets das Edge Functions.
  mpPublicKey: import.meta.env.VITE_MP_PUBLIC_KEY as string | undefined,
} as const;

if (!env.supabaseUrl) throw new Error("VITE_SUPABASE_URL não configurado. Crie um .env.local");
if (!env.supabaseAnonKey) throw new Error("VITE_SUPABASE_ANON_KEY não configurado. Crie um .env.local");

export { env };
