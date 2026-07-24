// Fonte única do valor do plano Starter — mantém o preço exibido em
// Configurações e o usado na estimativa de MRR do dashboard executivo
// sincronizados. Sem gateway de pagamento integrado, este é o único
// lugar que precisa mudar quando o preço mudar.
export const STARTER_MONTHLY_PRICE_BRL = 490;

// Mirrors o limite de análises do Freemium em
// supabase/functions/parse-contract/index.ts e src/hooks/useContracts.ts
// (Edge Function roda em runtime separado, não pode importar daqui).
export const FREEMIUM_MONTHLY_ANALYSIS_LIMIT = 1;

// Assinatura Starter é renovada manualmente pela Equipe Ponderum (sem
// gateway de pagamento) em ciclos fixos de 30 dias.
export const SUBSCRIPTION_RENEWAL_CYCLE_DAYS = 30;
export const SUBSCRIPTION_RENEWAL_WARNING_DAYS = 7;
