import { useState, useEffect } from "react";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { createObligation, type NewObligationData } from "@/hooks/useObligations";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

type Contract = { id: string; name: string };

const OBLIGATION_TYPES = [
  { value: "pagamento", label: "Pagamento" },
  { value: "entrega", label: "Entrega" },
  { value: "notificacao", label: "Notificação" },
  { value: "renovacao", label: "Renovação" },
  { value: "reajuste", label: "Reajuste" },
  { value: "outro", label: "Outro" },
];

const RECURRENCES = [
  { value: "none", label: "Sem recorrência" },
  { value: "monthly", label: "Mensal" },
  { value: "quarterly", label: "Trimestral" },
  { value: "yearly", label: "Anual" },
  { value: "custom", label: "Personalizado" },
];

const CUSTOM_UNITS = [
  { value: "dias", label: "dias" },
  { value: "semanas", label: "semanas" },
  { value: "meses", label: "meses" },
  { value: "anos", label: "anos" },
];

const RESPONSIBLE_OPTIONS = [
  { value: "parte_a", label: "Parte A (Contratante)" },
  { value: "parte_b", label: "Parte B (Contratado)" },
  { value: "ambas", label: "Ambas as partes" },
];

// ── Zod schema ───────────────────────────────────────────────────────────────
const brlToFloat = (v: string) =>
  parseFloat(v.replace(/\./g, "").replace(",", "."));

const obligationSchema = z.object({
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

type ObligationErrors = Partial<Record<keyof z.infer<typeof obligationSchema>, string>>;

type Props = { open: boolean; onClose: () => void };

const EMPTY = {
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

export function NewObligationModal({ open, onClose }: Props) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<ObligationErrors>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase
      .from("contracts")
      .select("id,name")
      .order("name", { ascending: true })
      .then(({ data }) => setContracts((data ?? []) as Contract[]));
  }, [open]);

  const set = (k: keyof typeof EMPTY) => (val: string) =>
    setForm((f) => ({ ...f, [k]: val }));

  const setInput = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleClose = () => {
    setForm(EMPTY);
    setErrors({});
    onClose();
  };

  const validateField = (field: keyof ObligationErrors, value: string) => {
    const result = obligationSchema.shape[field]?.safeParse(value);
    if (result && !result.success) {
      setErrors((prev) => ({ ...prev, [field]: result.error.issues[0]?.message }));
    } else {
      setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = obligationSchema.safeParse(form);
    if (!result.success) {
      const errs: ObligationErrors = {};
      result.error.issues.forEach((i) => {
        const f = i.path[0] as keyof ObligationErrors;
        if (!errs[f]) errs[f] = i.message;
      });
      setErrors(errs);
      return;
    }
    setErrors({});
    setSaving(true);
    let recurrenceValue: string | null = null;
    if (form.recurrence === "custom") {
      const qty = parseInt(form.custom_qty, 10);
      if (qty > 0) recurrenceValue = `a cada ${qty} ${form.custom_unit}`;
    } else if (form.recurrence !== "none") {
      recurrenceValue = form.recurrence;
    }

    const data: NewObligationData = {
      contract_id: form.contract_id,
      description: form.description.trim(),
      responsible: form.responsible || null,
      due_date: form.due_date || null,
      value_cents: form.value_brl
        ? Math.round(parseFloat(form.value_brl.replace(/\./g, "").replace(",", ".")) * 100)
        : null,
      penalty_text: form.penalty_text.trim() || null,
      obligation_type: form.obligation_type,
      recurrence: recurrenceValue,
    };
    const ok = await createObligation(data);
    setSaving(false);
    if (ok) handleClose();
  };

  const inputCls =
    "w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground";
  const labelCls = "block text-xs text-muted-foreground mb-1";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg w-full">
        <DialogHeader>
          <DialogTitle>Nova Obrigação</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          <div>
            <label className={labelCls}>Contrato *</label>
            <Select value={form.contract_id} onValueChange={(v) => { set("contract_id")(v); validateField("contract_id", v); }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione o contrato" />
              </SelectTrigger>
              <SelectContent>
                {contracts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.contract_id && <p className="text-[11px] text-destructive mt-1">{errors.contract_id}</p>}
          </div>

          <div>
            <label className={labelCls}>Descrição *</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => { setInput("description")(e); validateField("description", e.target.value); }}
              placeholder="Ex: Pagamento de R$ 5.000 até o dia 10 de cada mês"
              className={inputCls + " resize-none" + (errors.description ? " border-destructive/70" : "")}
            />
            {errors.description && <p className="text-[11px] text-destructive mt-1">{errors.description}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Tipo</label>
              <Select value={form.obligation_type} onValueChange={set("obligation_type")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OBLIGATION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className={labelCls}>Responsável</label>
              <Select value={form.responsible} onValueChange={set("responsible")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESPONSIBLE_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Data de vencimento</label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => { setInput("due_date")(e); validateField("due_date", e.target.value); }}
                className={inputCls + (errors.due_date ? " border-destructive/70" : "")}
              />
              {errors.due_date && <p className="text-[11px] text-destructive mt-1">{errors.due_date}</p>}
            </div>
            <div>
              <label className={labelCls}>Recorrência</label>
              <Select value={form.recurrence} onValueChange={set("recurrence")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECURRENCES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {form.recurrence === "custom" && (
            <div>
              <label className={labelCls}>Intervalo personalizado</label>
              <div className="grid grid-cols-[auto_1fr_1fr] items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">A cada</span>
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={form.custom_qty}
                  onChange={setInput("custom_qty")}
                  className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-center focus:outline-none focus:ring-1 focus:ring-primary text-foreground w-full"
                />
                <Select value={form.custom_unit} onValueChange={set("custom_unit")}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CUSTOM_UNITS.map((u) => (
                      <SelectItem key={u.value} value={u.value}>
                        {u.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.custom_qty && parseInt(form.custom_qty, 10) > 0 && (
                <p className="text-[11px] text-primary mt-1.5">
                  Recorrência: a cada {form.custom_qty} {form.custom_unit}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Valor (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                value={form.value_brl}
                onChange={(e) => { setInput("value_brl")(e); validateField("value_brl", e.target.value); }}
                placeholder="0,00"
                className={inputCls + (errors.value_brl ? " border-destructive/70" : "")}
              />
              {errors.value_brl && <p className="text-[11px] text-destructive mt-1">{errors.value_brl}</p>}
            </div>
            <div>
              <label className={labelCls}>Penalidade (texto)</label>
              <input
                type="text"
                value={form.penalty_text}
                onChange={setInput("penalty_text")}
                placeholder="Ex: Multa de 2% a.m."
                className={inputCls}
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="h-9 px-4 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !form.contract_id || !form.description.trim()}
              className="h-9 px-4 rounded-lg bg-primary text-black text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 inline-flex items-center gap-2"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Criar obrigação
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
