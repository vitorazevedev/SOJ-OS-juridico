// Modulo de Pagamentos, Fase 1 -- dinheiro sempre em centavos (integer),
// nunca float (Principio 6 da spec). Helpers pequenos e deliberadamente
// sem dependencia externa de formatacao de moeda.

/** Verdadeiro se o valor e um inteiro >= 0 -- forma valida de "centavos". */
export function isValidCents(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

/** Centavos -> string formatada em reais, ex: 19900 -> "R$ 199,00". */
export function centsToBRL(cents: number): string {
  if (!isValidCents(cents)) throw new Error(`centsToBRL: valor invalido (${cents}) -- precisa ser inteiro >= 0`)
  const reais = Math.floor(cents / 100)
  const centavos = cents % 100
  return `R$ ${reais.toLocaleString('pt-BR')},${String(centavos).padStart(2, '0')}`
}

/**
 * Reais (string ou number, ex: "199,00" / "199.00" / 199) -> centavos.
 * Nunca usar isso para guardar o resultado de um calculo repetido --
 * serve so para converter entrada humana (ex: seed de billing_plans) uma
 * vez, na borda do sistema.
 */
export function brlToCents(value: string | number): number {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`brlToCents: valor invalido (${value})`)
    return Math.round(value * 100)
  }
  const normalized = value.trim().replace(/\./g, '').replace(',', '.')
  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) throw new Error(`brlToCents: valor invalido ("${value}")`)
  return Math.round(parsed * 100)
}

/** Soma uma lista de valores em centavos sem passar por ponto flutuante. */
export function sumCents(values: readonly number[]): number {
  return values.reduce((total, v) => {
    if (!isValidCents(v)) throw new Error(`sumCents: valor invalido na lista (${v})`)
    return total + v
  }, 0)
}
