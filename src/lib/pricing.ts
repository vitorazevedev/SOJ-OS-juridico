// Fonte única do valor do plano Starter — mantém o preço exibido em
// Configurações e o usado na estimativa de MRR do dashboard executivo
// sincronizados. Sem gateway de pagamento integrado, este é o único
// lugar que precisa mudar quando o preço mudar.
export const STARTER_MONTHLY_PRICE_BRL = 490;

// Mirrors o limite de análises do Freemium e do Starter em
// supabase/functions/parse-contract/index.ts e src/hooks/useContracts.ts
// (Edge Function roda em runtime separado, não pode importar daqui).
export const FREEMIUM_MONTHLY_ANALYSIS_LIMIT = 1;
export const STARTER_MONTHLY_ANALYSIS_LIMIT = 15;
export const FREEMIUM_MAX_USERS = 1;
export const STARTER_MAX_USERS = 3;

// Assinatura Starter é renovada manualmente pela Equipe Ponderum (sem
// gateway de pagamento) em ciclos fixos de 30 dias.
export const SUBSCRIPTION_RENEWAL_CYCLE_DAYS = 30;
export const SUBSCRIPTION_RENEWAL_WARNING_DAYS = 7;

// Planos pagos via Mercado Pago (Story 1.2). Valores de LANÇAMENTO vindos
// de peças de campanha dos sócios (2026-10-13), AINDA NÃO CONFIRMADOS como
// definitivos. Mirrors supabase/functions/_shared/mercadopago-plans.ts
// (Edge Function roda em runtime separado, não pode importar daqui — mesma
// limitação dos valores do Starter acima). Editar os dois arquivos juntos
// quando os sócios confirmarem os preços finais.
export type PaidPlanId = "individual" | "escritorio" | "juridico" | "corporativo";

export const PAID_PLANS: Record<PaidPlanId, {
  label: string;
  priceBRL: number;
  monthlyAnalysisLimit: number;
  maxUsers: number;
}> = {
  individual: { label: "Individual", priceBRL: 199, monthlyAnalysisLimit: 5, maxUsers: 1 },
  escritorio: { label: "Escritório", priceBRL: 499, monthlyAnalysisLimit: 15, maxUsers: 3 },
  juridico: { label: "Jurídico", priceBRL: 899, monthlyAnalysisLimit: 40, maxUsers: 5 },
  corporativo: { label: "Corporativo", priceBRL: 1749, monthlyAnalysisLimit: 100, maxUsers: 10 },
};
