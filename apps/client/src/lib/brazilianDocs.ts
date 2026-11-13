// Formatting and validation for Brazilian CNPJ and CPF documents.

export type DocType = "cnpj" | "cpf" | "unknown";

function onlyDigits(s: string): string {
  return s.replace(/\D/g, "");
}

export function detectDocType(raw: string): DocType {
  const d = onlyDigits(raw);
  if (d.length <= 11) return "cpf";
  return "cnpj";
}

// ─── Formatting ──────────────────────────────────────────────────────────────

export function formatCpf(digits: string): string {
  const d = digits.slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function formatCnpj(digits: string): string {
  const d = digits.slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export function formatDocument(raw: string): string {
  const digits = onlyDigits(raw);
  if (digits.length <= 11) return formatCpf(digits);
  return formatCnpj(digits);
}

// ─── Validation ──────────────────────────────────────────────────────────────

function allSame(d: string): boolean {
  return d.split("").every((c) => c === d[0]);
}

export function validateCpf(raw: string): boolean {
  const d = onlyDigits(raw);
  if (d.length !== 11 || allSame(d)) return false;

  const calc = (digits: string, weights: number[]) => {
    const sum = digits.split("").reduce((acc, c, i) => acc + parseInt(c) * weights[i], 0);
    const rem = sum % 11;
    return rem < 2 ? 0 : 11 - rem;
  };

  const d1 = calc(d.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  if (d1 !== parseInt(d[9])) return false;
  const d2 = calc(d.slice(0, 10), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d2 === parseInt(d[10]);
}

export function validateCnpj(raw: string): boolean {
  const d = onlyDigits(raw);
  if (d.length !== 14 || allSame(d)) return false;

  const calc = (digits: string, weights: number[]) => {
    const sum = digits.split("").reduce((acc, c, i) => acc + parseInt(c) * weights[i], 0);
    const rem = sum % 11;
    return rem < 2 ? 0 : 11 - rem;
  };

  const d1 = calc(d.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  if (d1 !== parseInt(d[12])) return false;
  const d2 = calc(d.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d2 === parseInt(d[13]);
}

export function validateDocument(raw: string): { valid: boolean; type: DocType } {
  const digits = onlyDigits(raw);
  if (digits.length === 0) return { valid: true, type: "unknown" }; // empty is ok (field not required)
  if (digits.length <= 11) return { valid: validateCpf(digits), type: "cpf" };
  return { valid: validateCnpj(digits), type: "cnpj" };
}
