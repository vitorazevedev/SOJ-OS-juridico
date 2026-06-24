import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/components/AuthProvider";
import { SojCard } from "@/components/layout/Primitives";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, User } from "lucide-react";

const inputCls =
  "w-full rounded-[10px] border bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.1)] text-foreground focus:outline-none focus:border-[rgba(0,229,160,0.6)] transition-colors";

export function ProfileTab() {
  const { user } = useAuth();
  const [name, setName] = useState(
    (user?.user_metadata?.name as string | undefined) ?? ""
  );
  const [savingName, setSavingName] = useState(false);
  const [pwForm, setPwForm] = useState({ next: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const pwMismatch =
    !!pwForm.next && !!pwForm.confirm && pwForm.next !== pwForm.confirm;
  const pwTooShort = !!pwForm.next && pwForm.next.length < 8;

  const handleSaveName = async () => {
    if (!name.trim()) return;
    setSavingName(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { name: name.trim() },
      });
      if (error) throw error;
      await supabase
        .from("users")
        .update({ name: name.trim() })
        .eq("id", user!.id);
      toast.success("Nome atualizado");
    } catch (e: unknown) {
      toast.error((e as Error)?.message ?? "Erro ao atualizar nome");
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async () => {
    if (pwTooShort) { toast.error("Senha deve ter pelo menos 8 caracteres"); return; }
    if (pwMismatch) { toast.error("As senhas não coincidem"); return; }
    if (!pwForm.next) { toast.error("Informe a nova senha"); return; }
    setSavingPw(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwForm.next });
      if (error) throw error;
      toast.success("Senha alterada com sucesso");
      setPwForm({ next: "", confirm: "" });
    } catch (e: unknown) {
      toast.error((e as Error)?.message ?? "Erro ao alterar senha");
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6 mt-4">
      <SojCard className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium text-sm md:text-base">Meu Perfil</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Nome de exibição</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              className={inputCls}
              style={{ padding: "11px 12px", minHeight: 44 }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">E-mail</label>
            <input
              value={user?.email ?? ""}
              disabled
              className={inputCls + " opacity-50 cursor-not-allowed"}
              style={{ padding: "11px 12px", minHeight: 44 }}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            onClick={handleSaveName}
            disabled={savingName || !name.trim()}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {savingName ? "Salvando..." : "Salvar nome"}
          </button>
        </div>
      </SojCard>

      <SojCard className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium text-sm md:text-base">Alterar Senha</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Nova senha</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={pwForm.next}
                onChange={(e) => setPwForm((f) => ({ ...f, next: e.target.value }))}
                placeholder="Mínimo 8 caracteres"
                className={inputCls}
                style={{ padding: "11px 40px 11px 12px", minHeight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {pwTooShort && (
              <p className="text-[11px] text-risk-critical">Mínimo 8 caracteres</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Confirmar nova senha</label>
            <input
              type={showPw ? "text" : "password"}
              value={pwForm.confirm}
              onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
              placeholder="Repita a nova senha"
              className={inputCls}
              style={{ padding: "11px 12px", minHeight: 44 }}
            />
            {pwMismatch && (
              <p className="text-[11px] text-risk-critical">As senhas não coincidem</p>
            )}
          </div>
        </div>
        <div className="flex justify-end">
          <button
            onClick={handleChangePassword}
            disabled={savingPw || !pwForm.next || !pwForm.confirm || pwMismatch || pwTooShort}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {savingPw ? "Alterando..." : "Alterar senha"}
          </button>
        </div>
      </SojCard>

      <SojCard className="flex flex-col gap-3">
        <h3 className="font-medium text-sm md:text-base">Informações da Conta</h3>
        <div className="divide-y divide-border text-xs">
          <div className="flex justify-between items-center py-2.5">
            <span className="text-muted-foreground">ID do usuário</span>
            <span className="font-mono text-foreground/60">{user?.id?.slice(0, 8)}…</span>
          </div>
          <div className="flex justify-between items-center py-2.5">
            <span className="text-muted-foreground">Conta criada em</span>
            <span>
              {user?.created_at
                ? new Date(user.created_at).toLocaleDateString("pt-BR", {
                    day: "2-digit", month: "long", year: "numeric",
                  })
                : "—"}
            </span>
          </div>
          <div className="flex justify-between items-center py-2.5">
            <span className="text-muted-foreground">Último acesso</span>
            <span>
              {user?.last_sign_in_at
                ? new Date(user.last_sign_in_at).toLocaleDateString("pt-BR", {
                    day: "2-digit", month: "long", year: "numeric",
                  })
                : "—"}
            </span>
          </div>
        </div>
      </SojCard>
    </div>
  );
}
