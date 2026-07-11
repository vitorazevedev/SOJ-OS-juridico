import { z } from "zod";

export const OBLIGATION_TYPES = [
  { value: "pagamento", label: "Pagamento" },
  { value: "entrega", label: "Entrega" },
  { value: "notificacao", label: "Notificação" },
  { value: "renovacao", label: "Renovação" },
  { value: "reajuste", label: "Reajuste" },
  { value: "outro", label: "Outro" },
];

export const RECURRENCES = [
  { value: "none", label: "Sem recorrência" },
  { value: "monthly", label: "Mensal" },
  { value: "quarterly", label: "Trimestral" },
  { value: "yearly", label: "Anual" },
  { value: "custom", label: "Personalizado" },
];

export const CUSTOM_UNITS = [
  { value: "dias", label: "dias" },
  { value: "semanas", label: "semanas" },
  { value: "meses", label: "meses" },
  { value: "anos", label: "anos" },
];

export const RESPONSIBLE_OPTIONS = [
  { value: "parte_a", label: "Parte A (Contratante)" },
  { value: "parte_b", label: "Parte B (Contratado)" },
  { value: "ambas", label: "Ambas as partes" },
];

export const brlToFloat = (v: string) =>
  parseFloat(v.replace(/\./g, "").replace(",", "."));

export const obligationSchema = z.object({
  contract_id:     z.string().min(1, "Selecione um contrato"),
  description:     z.string().trim().min(5, "Mínimo de 5 caracteres").max(500, "Máximo de 500 caracteres"),
  due_date:        z.string().optional().refine(
    (v) => !v || !isNaN(Date.parse(v)), "Data inválida"
  ),
  value_brl:       z.string().optional().refine(
    (v) => !v || (!isNaN(brlToFloat(v)) && brlToFloat(v) >= 0),
    "Valor inválido — use o formato 1.000,00"
  ),
  penalty_text:    z.string().max(200, "Máximo de 200 caracteres").optional(),
  custom_qty:      z.string().optional().refine(
    (v) => !v || (Number(v) > 0 && Number(v) <= 999),
    "Intervalo deve ser entre 1 e 999"
  ),
});

export type ObligationErrors = Partial<Record<keyof z.infer<typeof obligationSchema>, string>>;

export const EMPTY_OBLIGATION_FORM = {
  contract_id: "",
  description: "",
  responsible: "ambas",
  due_date: "",
  value_brl: "",
  penalty_text: "",
  obligation_type: "outro",
  recurrence: "none",
  custom_qty: "1",
  custom_unit: "meses",
};

export type ObligationFormState = typeof EMPTY_OBLIGATION_FORM;

export function buildRecurrenceValue(form: ObligationFormState): string | null {
  if (form.recurrence === "custom") {
    const qty = parseInt(form.custom_qty, 10);
    return qty > 0 ? `a cada ${qty} ${form.custom_unit}` : null;
  }
  if (form.recurrence !== "none") return form.recurrence;
  return null;
}
