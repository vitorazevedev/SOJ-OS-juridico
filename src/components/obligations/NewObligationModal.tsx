import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { createObligation, type NewObligationData } from "@/hooks/useObligations";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { ObligationFormFields } from "@/components/obligations/ObligationFormFields";
import {
  buildRecurrenceValue, EMPTY_OBLIGATION_FORM, obligationSchema,
  type ObligationErrors, type ObligationFormState,
} from "@/lib/obligationForm";

type Contract = { id: string; name: string };
type Props = { open: boolean; onClose: () => void };

export function NewObligationModal({ open, onClose }: Props) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [form, setForm] = useState<ObligationFormState>(EMPTY_OBLIGATION_FORM);
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

  const set = (k: keyof ObligationFormState) => (val: string) =>
    setForm((f) => ({ ...f, [k]: val }));

  const setInput = (k: keyof ObligationFormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleClose = () => {
    setForm(EMPTY_OBLIGATION_FORM);
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
      recurrence: buildRecurrenceValue(form),
    };
    const ok = await createObligation(data);
    setSaving(false);
    if (ok) handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg w-full">
        <DialogHeader>
          <DialogTitle>Nova Obrigação</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          <ObligationFormFields
            contracts={contracts}
            form={form}
            errors={errors}
            set={set}
            setInput={setInput}
            validateField={validateField}
          />

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
