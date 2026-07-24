import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ShieldCheck, AlertCircle } from "lucide-react";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [linkInvalid, setLinkInvalid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsTermsCheckbox, setNeedsTermsCheckbox] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Links de recuperação/onboarding são de uso único. Se o usuário clicar de
  // novo num link já usado (ou o link tiver expirado), o Supabase redireciona
  // com #error=...&error_code=... em vez de autenticar — sem isso, a tela
  // ficava girando o spinner pra sempre.
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    if (hash.get("error")) {
      setLinkInvalid(true);
      return;
    }

    // Só tratamos como "veio de um link de recuperação válido" se a URL
    // atual realmente trouxer os parâmetros de recovery. Sem isso, um
    // usuário que já tenha uma sessão ativa por qualquer outro motivo (ex:
    // reabriu um link antigo já usado, estando logado) conseguia reabrir
    // este formulário e trocar a senha de novo, mesmo sem uma concessão de
    // recuperação nova — checar só "existe sessão" não bastava.
    const hasRecoveryHash = hash.get("type") === "recovery" && !!hash.get("access_token");
    if (!hasRecoveryHash) {
      setLinkInvalid(true);
      return;
    }

    // Usuários cadastrados manualmente pelo atendente (Equipe Ponderum) nunca
    // passaram pela tela pública de cadastro, então nunca aceitaram os Termos
    // de Uso/Política de Privacidade — cobramos esse aceite junto da criação
    // de senha. Quem já aceitou (cadastro público) não vê o checkbox.
    const checkTermsAcceptance = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: userRow } = await supabase
        .from("users")
        .select("terms_accepted_at")
        .eq("id", user.id)
        .maybeSingle();
      if (!userRow?.terms_accepted_at) setNeedsTermsCheckbox(true);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
        checkTermsAcceptance();
      }
    });
    // Fallback: alguns navegadores já processam o hash antes deste listener
    // ser registrado, disparando o evento antes que possamos ouvi-lo. Só
    // confiamos nesse fallback porque já confirmamos acima que a URL atual
    // trazia os parâmetros de recovery.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setReady(true);
        checkTermsAcceptance();
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres");
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não coincidem");
      return;
    }
    if (needsTermsCheckbox && !acceptedTerms) {
      toast.error("É necessário aceitar os Termos de Uso e a Política de Privacidade");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error("Erro ao redefinir senha. O link pode ter expirado.");
        return;
      }
      if (needsTermsCheckbox) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("users").update({ terms_accepted_at: new Date().toISOString() }).eq("id", user.id);
        }
      }
      toast.success("Senha redefinida com sucesso!");
      navigate("/", { replace: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <img src="/ponderum-icon-white.png" alt="Ponderum" className="h-12 w-12 mb-3 object-contain" />
          <h1 className="text-2xl font-semibold tracking-tight">Redefinir senha</h1>
          <p className="text-xs text-muted-foreground tracking-wide mt-1">Ponderum · Inteligência contratual</p>
        </div>

        <Card className="p-6">
          {linkInvalid ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">Senha já cadastrada</p>
              <p className="text-xs text-muted-foreground">
                Este link já foi usado ou expirou. Se você já criou sua senha, entre normalmente.
              </p>
              <Button className="w-full mt-2" onClick={() => navigate("/login", { replace: true })}>
                Ir para o login
              </Button>
            </div>
          ) : !ready ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Verificando link de recuperação…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">Crie uma nova senha</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Nova senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirmar senha</Label>
                <Input
                  id="confirm"
                  type="password"
                  placeholder="Repita a nova senha"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
              {needsTermsCheckbox && (
                <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-primary"
                  />
                  <span>
                    Li e aceito os{" "}
                    <Link to="/termos" target="_blank" className="text-primary hover:underline">
                      Termos de Uso
                    </Link>{" "}
                    e a{" "}
                    <Link to="/privacidade" target="_blank" className="text-primary hover:underline">
                      Política de Privacidade
                    </Link>
                  </span>
                </label>
              )}
              <Button type="submit" className="w-full" disabled={loading || (needsTermsCheckbox && !acceptedTerms)}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar nova senha
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
