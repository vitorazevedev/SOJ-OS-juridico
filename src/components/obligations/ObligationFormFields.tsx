import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CUSTOM_UNITS, OBLIGATION_TYPES, RECURRENCES, RESPONSIBLE_OPTIONS,
  type ObligationErrors, type ObligationFormState,
} from "@/lib/obligationForm";

type Contract = { id: string; name: string };

const inputCls =
  "w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground";
const labelCls = "block text-xs text-muted-foreground mb-1";

export function ObligationFormFields({
  contracts,
  form,
  errors,
  set,
  setInput,
  validateField,
}: {
  contracts: Contract[];
  form: ObligationFormState;
  errors: ObligationErrors;
  set: (k: keyof ObligationFormState) => (val: string) => void;
  setInput: (k: keyof ObligationFormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  validateField: (field: keyof ObligationErrors, value: string) => void;
}) {
  return (
    <>
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
    </>
  );
}
