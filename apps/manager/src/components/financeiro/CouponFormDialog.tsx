import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, Input, Label, Button, Switch } from "@ponderum/ui";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { buildRuleText } from "@/lib/couponRuleText";
import type { Coupon } from "@/pages/Cupons";

type Plan = { code: string; price_cents: number };

type Props = {
  open: boolean;
  coupon: Coupon | null; // null = criar novo
  onClose: () => void;
  onSaved: () => void;
};

const SELECT_CLASS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export function CouponFormDialog({ open, coupon, onClose, onSaved }: Props) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [previewPlan, setPreviewPlan] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [discountValue, setDiscountValue] = useState("10");
  const [duration, setDuration] = useState<"once" | "repeating" | "forever">("once");
  const [durationCycles, setDurationCycles] = useState("1");
  const [validUntil, setValidUntil] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [maxPerOrganization, setMaxPerOrganization] = useState("1");
  const [allowedPlans, setAllowedPlans] = useState<string[]>([]);
  const [allowedMethods, setAllowedMethods] = useState<string[]>(["card", "pix"]);
  const [newCustomersOnly, setNewCustomersOnly] = useState(false);

  const hasRedemptions = !!coupon && coupon.redemptions_count > 0;

  useEffect(() => {
    supabase.from("billing_plans").select("code, price_cents").eq("is_active", true).then(({ data }) => {
      const list = (data as Plan[]) ?? [];
      setPlans(list);
      setPreviewPlan((p) => p || list[0]?.code || "");
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (coupon) {
      setCode(coupon.code);
      setDescription(coupon.description ?? "");
      setDiscountType(coupon.discount_type);
      setDiscountValue(String(coupon.discount_value));
      setDuration(coupon.duration);
      setDurationCycles(String(coupon.duration_cycles ?? 1));
      setValidUntil(coupon.valid_until ? coupon.valid_until.slice(0, 10) : "");
      setMaxRedemptions(coupon.max_redemptions != null ? String(coupon.max_redemptions) : "");
      setMaxPerOrganization(String(coupon.max_per_organization));
      setAllowedPlans(coupon.allowed_plans);
      setAllowedMethods(coupon.allowed_methods);
      setNewCustomersOnly(coupon.new_customers_only);
    } else {
      setCode("");
      setDescription("");
      setDiscountType("percent");
      setDiscountValue("10");
      setDuration("once");
      setDurationCycles("1");
      setValidUntil("");
      setMaxRedemptions("");
      setMaxPerOrganization("1");
      setAllowedPlans([]);
      setAllowedMethods(["card", "pix"]);
      setNewCustomersOnly(false);
    }
  }, [open, coupon]);

  const toggleIn = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const discountValueNum = Number(discountValue);
  const valid =
    code.trim().length > 0 &&
    discountValueNum > 0 &&
    (discountType !== "percent" || discountValueNum <= 99) &&
    (duration !== "repeating" || Number(durationCycles) > 0) &&
    allowedMethods.length > 0;

  const previewPlanPrice = plans.find((p) => p.code === previewPlan)?.price_cents ?? 0;
  const ruleText =
    discountValueNum > 0 && previewPlanPrice > 0
      ? buildRuleText(
          { discount_type: discountType, discount_value: discountValueNum, duration, duration_cycles: Number(durationCycles) || null },
          previewPlanPrice,
        )
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    setError(null);

    const payload = {
      p_description: description.trim() || undefined,
      p_valid_until: validUntil ? new Date(validUntil).toISOString() : undefined,
      p_max_redemptions: maxRedemptions ? Number(maxRedemptions) : undefined,
      p_max_per_organization: Number(maxPerOrganization) || 1,
    };

    const { error: rpcError } = coupon
      ? await supabase.rpc("update_coupon", {
          p_id: coupon.id,
          ...payload,
          p_discount_type: hasRedemptions ? undefined : discountType,
          p_discount_value: hasRedemptions ? undefined : discountValueNum,
          p_duration: hasRedemptions ? undefined : duration,
          p_duration_cycles: hasRedemptions ? undefined : duration === "repeating" ? Number(durationCycles) : undefined,
        })
      : await supabase.rpc("create_coupon", {
          p_code: code.trim(),
          p_discount_type: discountType,
          p_discount_value: discountValueNum,
          p_duration: duration,
          p_duration_cycles: duration === "repeating" ? Number(durationCycles) : undefined,
          p_valid_until: payload.p_valid_until,
          p_max_redemptions: payload.p_max_redemptions,
          p_max_per_organization: payload.p_max_per_organization,
          p_allowed_plans: allowedPlans,
          p_allowed_methods: allowedMethods,
          p_new_customers_only: newCustomersOnly,
          p_description: payload.p_description,
        });

    setSaving(false);
    if (rpcError) {
      setError(rpcError.message.includes("duplicate key") ? "Já existe um cupom com este código." : rpcError.message);
      return;
    }
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg w-full max-h-[85vh] overflow-y-auto scroll-thin">
        <DialogHeader>
          <DialogTitle>{coupon ? `Editar cupom ${coupon.code}` : "Novo cupom"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          {hasRedemptions && (
            <p className="text-[11px] text-muted-foreground bg-muted/30 rounded-md px-3 py-2">
              Este cupom já tem resgates — desconto e duração não podem mais ser alterados. Para mudar isso, crie outro
              cupom.
            </p>
          )}

          <div className="space-y-1">
            <Label htmlFor="coupon-code">Código *</Label>
            <Input
              id="coupon-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="LANCAMENTO50"
              disabled={!!coupon}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="coupon-desc">Descrição</Label>
            <Input id="coupon-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Campanha de lançamento" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="coupon-type">Tipo de desconto</Label>
              <select
                id="coupon-type"
                className={SELECT_CLASS}
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as "percent" | "fixed")}
                disabled={hasRedemptions}
              >
                <option value="percent">Percentual</option>
                <option value="fixed">Valor fixo (centavos)</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="coupon-value">{discountType === "percent" ? "Valor (1–99%)" : "Valor (centavos)"}</Label>
              <Input
                id="coupon-value"
                type="number"
                min={1}
                max={discountType === "percent" ? 99 : undefined}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                disabled={hasRedemptions}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="coupon-duration">Duração</Label>
              <select
                id="coupon-duration"
                className={SELECT_CLASS}
                value={duration}
                onChange={(e) => setDuration(e.target.value as "once" | "repeating" | "forever")}
                disabled={hasRedemptions}
              >
                <option value="once">Só a 1ª cobrança</option>
                <option value="repeating">N ciclos</option>
                <option value="forever">Para sempre</option>
              </select>
            </div>
            {duration === "repeating" && (
              <div className="space-y-1">
                <Label htmlFor="coupon-cycles">Nº de ciclos</Label>
                <Input
                  id="coupon-cycles"
                  type="number"
                  min={1}
                  value={durationCycles}
                  onChange={(e) => setDurationCycles(e.target.value)}
                  disabled={hasRedemptions}
                />
              </div>
            )}
          </div>

          {ruleText && (
            <div className="space-y-1.5">
              <Label htmlFor="coupon-preview-plan" className="text-[11px] text-muted-foreground">
                Simular no plano
              </Label>
              <select id="coupon-preview-plan" className={SELECT_CLASS} value={previewPlan} onChange={(e) => setPreviewPlan(e.target.value)}>
                {plans.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.code}
                  </option>
                ))}
              </select>
              <p className="text-xs text-primary bg-primary-dim rounded-md px-3 py-2 mt-1">{ruleText}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="coupon-valid-until">Válido até (opcional)</Label>
              <Input id="coupon-valid-until" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="coupon-max-total">Limite total de usos</Label>
              <Input
                id="coupon-max-total"
                type="number"
                min={1}
                placeholder="Sem limite"
                value={maxRedemptions}
                onChange={(e) => setMaxRedemptions(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="coupon-max-org">Limite por organização</Label>
            <Input id="coupon-max-org" type="number" min={1} value={maxPerOrganization} onChange={(e) => setMaxPerOrganization(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">Planos em que vale (vazio = todos)</Label>
            <div className="flex flex-wrap gap-2">
              {plans.map((p) => (
                <button
                  type="button"
                  key={p.code}
                  onClick={() => !coupon && setAllowedPlans((list) => toggleIn(list, p.code))}
                  disabled={!!coupon}
                  className={`px-2.5 py-1 rounded-md text-xs border transition-colors ${
                    allowedPlans.includes(p.code)
                      ? "border-primary bg-primary-dim text-primary"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {p.code}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">Métodos de pagamento</Label>
            <div className="flex gap-2">
              {["card", "pix"].map((m) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => !coupon && setAllowedMethods((list) => toggleIn(list, m))}
                  disabled={!!coupon}
                  className={`px-2.5 py-1 rounded-md text-xs border transition-colors ${
                    allowedMethods.includes(m) ? "border-primary bg-primary-dim text-primary" : "border-border text-muted-foreground"
                  }`}
                >
                  {m === "card" ? "Cartão" : "Pix"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between py-1">
            <Label htmlFor="coupon-new-only" className="text-sm">
              Só para novos clientes
            </Label>
            <Switch id="coupon-new-only" checked={newCustomersOnly} onCheckedChange={setNewCustomersOnly} disabled={!!coupon} />
          </div>

          {coupon && (
            <div className="flex items-center justify-between py-1">
              <Label htmlFor="coupon-active" className="text-sm">
                Cupom ativo
              </Label>
              <Switch id="coupon-active" checked={coupon.is_active} onCheckedChange={(v) => supabase.rpc("set_coupon_active", { p_id: coupon.id, p_is_active: v }).then(onSaved)} />
            </div>
          )}

          {error && <p className="text-xs text-risk-high">{error}</p>}

          <div className="flex gap-3 justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancelar
            </button>
            <Button type="submit" disabled={saving || !valid}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {coupon ? "Salvar alterações" : "Criar cupom"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
