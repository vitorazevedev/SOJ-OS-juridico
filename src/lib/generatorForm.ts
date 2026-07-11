import { z } from "zod";
import { buildContractSections } from "@/lib/contractDocs";
import { validateDocument } from "@/lib/brazilianDocs";

export const STEPS = ["Tipo de Contrato", "Informações", "Revisar", "Concluído"];

export type FormState = {
  name: string;
  partyA: string;
  cnpjA: string;
  cityA: string;
  partyB: string;
  cnpjB: string;
  cityB: string;
  value: string;
  term: string;
  sector: string;
  foro: string;
  notes: string;
};

export const EMPTY_FORM: FormState = {
  name: "", partyA: "", cnpjA: "", cityA: "",
  partyB: "", cnpjB: "", cityB: "",
  value: "", term: "", sector: "", foro: "", notes: "",
};

// Validação de fronteira do wizard (CLAUDE.md: "Zod em todas as fronteiras").
// CNPJ/CPF são opcionais no formulário, mas quando preenchidos precisam ter dígito verificador válido.
export const contractFormSchema = z.object({
  name: z.string().trim().min(1, "Nome do contrato é obrigatório").max(120, "Máximo de 120 caracteres"),
  partyA: z.string().max(200, "Máximo de 200 caracteres").optional(),
  cnpjA: z.string().optional().refine((v) => !v || validateDocument(v).valid, { message: "CNPJ/CPF inválido" }),
  cityA: z.string().max(120, "Máximo de 120 caracteres").optional(),
  partyB: z.string().max(200, "Máximo de 200 caracteres").optional(),
  cnpjB: z.string().optional().refine((v) => !v || validateDocument(v).valid, { message: "CNPJ/CPF inválido" }),
  cityB: z.string().max(120, "Máximo de 120 caracteres").optional(),
  value: z.string().max(30, "Valor muito longo").optional(),
  term: z.string().max(120, "Máximo de 120 caracteres").optional(),
  sector: z.string().max(120, "Máximo de 120 caracteres").optional(),
  foro: z.string().max(120, "Máximo de 120 caracteres").optional(),
  notes: z.string().max(2000, "Máximo de 2000 caracteres").optional(),
});

export type FormErrors = Partial<Record<keyof FormState, string>>;

export function validateForm(form: FormState): FormErrors {
  const result = contractFormSchema.safeParse(form);
  if (result.success) return {};
  const errors: FormErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof FormState;
    if (!errors[field]) errors[field] = issue.message;
  }
  return errors;
}

export const inputCls =
  "w-full rounded-[10px] border bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.1)] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[rgba(0,229,160,0.6)] transition-colors text-base md:text-sm";

export function slugifyName(name: string): string {
  return (name || "contrato")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "contrato";
}

export function buildContractText(tplTitle: string, form: FormState, tplId?: string) {
  const sections = buildContractSections(tplTitle, form, tplId);
  return [
    sections.title,
    "",
    sections.parties.contratante,
    sections.parties.contratado,
    "",
    ...sections.clauses.flatMap((c) => [`${c.heading}`, c.body, ""]),
    ...sections.footer,
  ].join("\n");
}

export function parseValueToCents(raw: string): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
  const n = parseFloat(cleaned);
  if (isNaN(n)) return null;
  return Math.round(n * 100);
}
