import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/components/AuthProvider";
import { SojCard } from "@/components/layout/Primitives";
import { toast } from "sonner";
import { Bell } from "lucide-react";

type NotifPrefs = {
  obligations_enabled: boolean;
  alert_30: boolean;
  alert_15: boolean;
  alert_7: boolean;
  alert_0: boolean;
  contracts_summary: boolean;
};

const DEFAULT_PREFS: NotifPrefs = {
  obligations_enabled: true,
  alert_30: true,
  alert_15: true,
  alert_7: true,
  alert_0: true,
  contracts_summary: false,
};

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors disabled:cursor-not-allowed disabled:opacity-40"
      style={{ background: checked ? "#00e5a0" : "rgba(255,255,255,0.1)" }}
    >
      <span
        className="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform"
        style={{ transform: checked ? "translateX(20px)" : "translateX(0)" }}
      />
    </button>
  );
}

function Row({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

export function NotificationsTab() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<NotifPrefs>(() => {
    const saved = user?.user_metadata?.notification_prefs as Partial<NotifPrefs> | undefined;
    return { ...DEFAULT_PREFS, ...saved };
  });
  const [saving, setSaving] = useState(false);

  const set = (key: keyof NotifPrefs) => (val: boolean) =>
    setPrefs((p) => ({ ...p, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { notification_prefs: prefs },
      });
      if (error) throw error;
      toast.success("Preferências de notificação salvas");
    } catch (e: unknown) {
      toast.error((e as Error)?.message ?? "Erro ao salvar preferências");
    } finally {
      setSaving(false);
    }
  };

  const alertsDisabled = !prefs.obligations_enabled;

  return (
    <div className="flex flex-col gap-4 md:gap-6 mt-4">
      <SojCard className="flex flex-col gap-1">
        <div className="flex items-center gap-2 mb-3">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium text-sm md:text-base">Alertas de Obrigações</h3>
        </div>
        <div className="divide-y divide-border">
          <Row
            label="Alertas de obrigações por e-mail"
            description="Receba lembretes por e-mail sobre prazos de contratos"
            checked={prefs.obligations_enabled}
            onChange={set("obligations_enabled")}
          />
          <Row
            label="30 dias antes do vencimento"
            checked={prefs.alert_30}
            onChange={set("alert_30")}
            disabled={alertsDisabled}
          />
          <Row
            label="15 dias antes do vencimento"
            checked={prefs.alert_15}
            onChange={set("alert_15")}
            disabled={alertsDisabled}
          />
          <Row
            label="7 dias antes do vencimento"
            checked={prefs.alert_7}
            onChange={set("alert_7")}
            disabled={alertsDisabled}
          />
          <Row
            label="No dia do vencimento"
            checked={prefs.alert_0}
            onChange={set("alert_0")}
            disabled={alertsDisabled}
          />
        </div>
      </SojCard>

      <SojCard className="flex flex-col gap-1">
        <h3 className="font-medium text-sm md:text-base mb-3">Relatórios</h3>
        <div className="divide-y divide-border">
          <Row
            label="Resumo semanal de contratos"
            description="Resumo por e-mail toda segunda-feira com o status dos contratos ativos"
            checked={prefs.contracts_summary}
            onChange={set("contracts_summary")}
          />
        </div>
      </SojCard>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {saving ? "Salvando..." : "Salvar preferências"}
        </button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Os e-mails de alerta serão ativados quando o envio automático estiver configurado.
        As preferências salvas aqui já ficam registradas para quando o serviço for habilitado.
      </p>
    </div>
  );
}
