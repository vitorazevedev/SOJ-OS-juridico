// Mirrors PAID_PLANS em src/lib/pricing.ts -- a Edge Function roda em
// runtime separado (Deno), não pode importar de src/. Valores de
// LANÇAMENTO vindos de peças de campanha dos sócios (2026-10-13), AINDA
// NÃO CONFIRMADOS como definitivos -- editar os dois arquivos juntos
// quando os sócios decidirem os preços finais. Ver Story 1.2.
export type PaidPlanId = 'individual' | 'escritorio' | 'juridico' | 'corporativo'

export const PAID_PLANS: Record<PaidPlanId, {
  label: string
  amountCents: number
  monthlyAnalysisLimit: number
  maxUsers: number
}> = {
  individual: { label: 'Individual', amountCents: 19900, monthlyAnalysisLimit: 5, maxUsers: 1 },
  escritorio: { label: 'Escritório', amountCents: 49900, monthlyAnalysisLimit: 15, maxUsers: 3 },
  juridico: { label: 'Jurídico', amountCents: 89900, monthlyAnalysisLimit: 40, maxUsers: 5 },
  corporativo: { label: 'Corporativo', amountCents: 174900, monthlyAnalysisLimit: 100, maxUsers: 10 },
}

export function isValidPaidPlanId(value: string): value is PaidPlanId {
  return value in PAID_PLANS
}
