// Modulo de Pagamentos, Fase 3 -- validação de CPF/CNPJ (dígito
// verificador, algoritmo padrão) e busca de endereço por CEP (ViaCEP,
// API pública sem chave), usados no checkout (dados de faturamento).

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function isValidCPF(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const digits = cpf.split("").map(Number);
  const checkDigit = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += digits[i] * (len + 1 - i);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  return checkDigit(9) === digits[9] && checkDigit(10) === digits[10];
}

export function isValidCNPJ(value: string): boolean {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;

  const digits = cnpj.split("").map(Number);
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const checkDigit = (len: number, weights: number[]) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += digits[i] * weights[i];
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  return checkDigit(12, weights1) === digits[12] && checkDigit(13, weights2) === digits[13];
}

export function isValidDocument(value: string, type: "CPF" | "CNPJ"): boolean {
  return type === "CPF" ? isValidCPF(value) : isValidCNPJ(value);
}

export function formatCPF(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  return d.replace(/(\d{3})(\d{0,3})(\d{0,3})(\d{0,2})/, (_, a, b, c, e) =>
    [a, b, c].filter(Boolean).join(".") + (e ? `-${e}` : "")
  );
}

export function formatCNPJ(value: string): string {
  const d = onlyDigits(value).slice(0, 14);
  return d.replace(/(\d{2})(\d{0,3})(\d{0,3})(\d{0,4})(\d{0,2})/, (_, a, b, c, e, f) =>
    [a, b, c].filter(Boolean).join(".") + (e ? `/${e}` : "") + (f ? `-${f}` : "")
  );
}

export type ViaCepAddress = {
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  cep: string;
};

/** Busca endereço por CEP via ViaCEP. Devolve null se CEP inválido/não encontrado. */
export async function lookupCep(cep: string): Promise<ViaCepAddress | null> {
  const digits = onlyDigits(cep);
  if (digits.length !== 8) return null;

  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.erro) return null;
    return data as ViaCepAddress;
  } catch {
    return null;
  }
}
