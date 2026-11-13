import { useEffect, useState } from "react";
import { SojCard } from "@/components/layout/Primitives";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

type Stats = { total_clicks: number; clicks_this_month: number };

export function SupportChannelCard() {
  const [whatsapp, setWhatsapp] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    const [{ data: setting }, { data: statsData }] = await Promise.all([
      supabase.from("app_settings").select("value").eq("key", "support_whatsapp").maybeSingle(),
      supabase.rpc("get_support_stats"),
    ]);
    setWhatsapp(setting?.value ?? null);
    setStats((statsData as unknown as Stats) ?? null);
  };

  useEffect(() => { fetchData(); }, []);

  const startEdit = () => {
    setEditValue(whatsapp ?? "");
    setEditing(true);
  };

  const saveNumber = async () => {
    const digits = editValue.replace(/\D/g, "");
    if (digits.length < 10) {
      toast.error("Informe um número de WhatsApp válido, com DDI e DDD");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.rpc("staff_set_support_whatsapp", { p_number: digits });
      if (error) {
        toast.error("Erro ao salvar número");
        return;
      }
      toast.success("Número do canal de suporte atualizado");
      setEditing(false);
      fetchData();
    } finally {
      setSaving(false);
    }
  };

  const formattedNumber = whatsapp
    ? `+${whatsapp.slice(0, 2)} ${whatsapp.slice(2, 4)} ${whatsapp.slice(4, 9)}-${whatsapp.slice(9)}`
    : "—";

  return (
    <SojCard className="flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-medium">Canal de suporte</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Botão flutuante "Suporte" no app abre este WhatsApp com uma mensagem pronta.
          </p>
        </div>
        <span className="text-[10px] font-mono text-primary px-3 py-1.5 border border-primary/30 bg-primary-dim rounded-lg shrink-0">Ativo</span>
      </div>

      {editing ? (
        <div className="flex flex-col md:flex-row gap-2 md:items-center">
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder="5511964889002 (DDI + DDD + número, só dígitos)"
            className="max-w-xs"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={saveNumber} disabled={saving}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Salvar
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
          <span className="text-sm font-mono">{formattedNumber}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={startEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border p-3">
          <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Cliques (total)</p>
          <p className="text-xl font-semibold tabular-nums mt-1">{stats?.total_clicks ?? "—"}</p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Cliques (mês atual)</p>
          <p className="text-xl font-semibold tabular-nums mt-1">{stats?.clicks_this_month ?? "—"}</p>
        </div>
      </div>
    </SojCard>
  );
}
