import { z } from "zod";
import { validateDocument } from "@/lib/brazilianDocs";
import { CONTRACT_FIELD_DICTIONARY } from "@/lib/contractFieldDictionary";
import type { ContractTemplate } from "@/data/contractTemplatesCatalog";

// Os 6 campos de identidade das partes (razão social/CNPJ/endereço) são
// renderizados à parte, no bloco fixo "Parte A/Parte B" — nunca aparecem na
// lista genérica de campos por seção do modelo.
export const PARTY_IDENTITY_FIELDS = [
  "PARTE_A_RAZAO_SOCIAL", "PARTE_A_CNPJ", "PARTE_A_ENDERECO",
  "PARTE_B_RAZAO_SOCIAL", "PARTE_B_CNPJ", "PARTE_B_ENDERECO",
] as const;

export function emptyFieldValues(fields: string[]): Record<string, string> {
  return Object.fromEntries(fields.map((f) => [f, ""]));
}

// Zod em toda fronteira (CLAUDE.md): todo campo do modelo é obrigatório —
// campos de documento (CNPJ/CPF) validam dígito verificador via validateDocument,
// os demais só exigem não estarem vazios (o texto/conteúdo em si é livre).
export function buildDynamicFieldsSchema(fields: string[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of fields) {
    const def = CONTRACT_FIELD_DICTIONARY[field];
    if (def?.type === "document") {
      shape[field] = z.string().min(1, "Campo obrigatório").refine(
        (v) => validateDocument(v).valid,
        { message: "CNPJ/CPF inválido" },
      );
    } else {
      shape[field] = z.string().trim().min(1, "Campo obrigatório");
    }
  }
  return z.object(shape);
}

export function validateDynamicFields(
  fields: string[],
  values: Record<string, string>,
): Record<string, string> {
  const schema = buildDynamicFieldsSchema(fields);
  const result = schema.safeParse(values);
  if (result.success) return {};
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as string;
    if (!errors[field]) errors[field] = issue.message;
  }
  return errors;
}

export function contractNameSchema() {
  return z.string().trim().min(1, "Nome do contrato é obrigatório").max(120, "Máximo de 120 caracteres");
}

// Rótulo de cabeçalho do bloco "Parte A/B" — usa o papel real do modelo
// (ex: "Parte A — CONTRATANTE"), nunca um rótulo genérico.
export function partyBlockLabel(tpl: ContractTemplate, side: "A" | "B"): string {
  return `Parte ${side} — ${side === "A" ? tpl.parteA : tpl.parteB}`;
}
