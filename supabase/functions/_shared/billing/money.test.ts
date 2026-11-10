// Testes dos helpers de dinheiro em centavos (Principio 6 da spec). Roda com:
//   deno test supabase/functions/_shared/billing/money.test.ts
import { assertEquals, assertThrows } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { isValidCents, centsToBRL, brlToCents, sumCents } from './money.ts'

Deno.test('isValidCents aceita apenas inteiros >= 0', () => {
  assertEquals(isValidCents(0), true)
  assertEquals(isValidCents(19900), true)
  assertEquals(isValidCents(-1), false)
  assertEquals(isValidCents(19.9), false)
  assertEquals(isValidCents('199' as unknown as number), false)
})

Deno.test('centsToBRL formata corretamente', () => {
  assertEquals(centsToBRL(19900), 'R$ 199,00')
  assertEquals(centsToBRL(0), 'R$ 0,00')
  assertEquals(centsToBRL(5), 'R$ 0,05')
  assertEquals(centsToBRL(174900), 'R$ 1.749,00')
})

Deno.test('centsToBRL rejeita valor invalido', () => {
  assertThrows(() => centsToBRL(-1))
  assertThrows(() => centsToBRL(19.9))
})

Deno.test('brlToCents converte string e number', () => {
  assertEquals(brlToCents('199,00'), 19900)
  assertEquals(brlToCents('199.00'), 19900)
  assertEquals(brlToCents('1.749,00'), 174900)
  assertEquals(brlToCents(199), 19900)
})

Deno.test('sumCents soma uma lista de centavos', () => {
  assertEquals(sumCents([19900, 49900, 0]), 69800)
  assertEquals(sumCents([]), 0)
})

Deno.test('sumCents rejeita valor invalido na lista', () => {
  assertThrows(() => sumCents([19900, -1]))
})
