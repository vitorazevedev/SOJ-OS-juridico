// Mesma logica de calculateDiscount/buildRuleText de
// supabase/functions/_shared/billing/domain/coupons.ts -- duplicacao
// deliberada (arquivo pequeno e puro) pra o manager poder mostrar a
// previa da regra sem chamar uma Edge Function so pra isso.

export type CouponPreviewInput = {
  discount_type: "percent" | "fixed";
  discount_value: number;
  duration: "once" | "repeating" | "forever";
  duration_cycles: number | null;
};

const fmtBRL = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function calculateDiscount(planPriceCents: number, coupon: CouponPreviewInput): number {
  if (coupon.discount_type === "percent") {
    return Math.floor((planPriceCents * (100 - coupon.discount_value)) / 100);
  }
  return Math.max(planPriceCents - coupon.discount_value, 0);
}

/** Resumo curto, sem valores (usado na lista de cupons). */
export function shortRuleLabel(coupon: CouponPreviewInput): string {
  const discountLabel = coupon.discount_type === "percent" ? `${coupon.discount_value}%` : fmtBRL(coupon.discount_value);
  if (coupon.duration === "forever") return `${discountLabel} para sempre`;
  if (coupon.duration === "once") return `${discountLabel} na 1ª mensalidade`;
  return `${discountLabel} por ${coupon.duration_cycles ?? 1} meses`;
}

/** Texto completo com valores, pra simulacao no formulario de criar/editar. */
export function buildRuleText(coupon: CouponPreviewInput, fullAmountCents: number): string {
  const discountedAmountCents = calculateDiscount(fullAmountCents, coupon);
  const discountLabel = coupon.discount_type === "percent" ? `${coupon.discount_value}%` : fmtBRL(coupon.discount_value);

  if (coupon.duration === "forever") {
    return `${discountLabel} de desconto para sempre. O cliente paga ${fmtBRL(discountedAmountCents)}/mês.`;
  }
  if (coupon.duration === "once") {
    return `${discountLabel} de desconto na 1ª mensalidade (${fmtBRL(discountedAmountCents)}). A partir da 2ª: ${fmtBRL(fullAmountCents)}/mês.`;
  }
  const n = coupon.duration_cycles ?? 1;
  return `${discountLabel} de desconto nas ${n} primeiras mensalidades (${fmtBRL(discountedAmountCents)}/mês). A partir da ${n + 1}ª: ${fmtBRL(fullAmountCents)}/mês.`;
}
