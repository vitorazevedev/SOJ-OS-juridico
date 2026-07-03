import { useState, useEffect } from "react";
import { z } from "zod";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Mail } from "lucide-react";

type Mode = "login" | "signup" | "forgot" | "check_email";

const loginSchema = z.object({
  email:    z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

const signupSchema = loginSchema.extend({
  name:    z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres"),
  orgName: z.string().trim().min(2, "Nome da empresa deve ter pelo menos 2 caracteres"),
});

const forgotSchema = z.object({
  email: z.string().email("Email inválido"),
});

type FormErrors = Partial<Record<"email" | "password" | "name" | "orgName", string>>;

const translateError = (msg: string): string => {
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials")) return "Email ou senha incorretos";
  if (m.includes("user already registered") || m.includes("already been registered"))
    return "Este email já está cadastrado";
  if (m.includes("password should be at least")) return "A senha deve ter no mínimo 6 caracteres";
  if (m.includes("invalid email")) return "Email inválido";
  if (m.includes("email not confirmed")) return "Confirme seu email antes de entrar";
  if (m.includes("rate limit") || m.includes("too many")) return "Muitas tentativas. Tente novamente em instantes";
  if (m.includes("network")) return "Erro de conexão. Verifique sua internet";
  return "Algo deu errado. Tente novamente";
};

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const clearErrors = () => setFieldErrors({});

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname || "/";

  useEffect(() => {
    if (!authLoading && session) navigate(from, { replace: true });
  }, [session, authLoading, navigate, from]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const errs: FormErrors = {};
      result.error.issues.forEach((i) => { const f = i.path[0] as keyof FormErrors; if (!errs[f]) errs[f] = i.message; });
      setFieldErrors(errs);
      return;
    }
    clearErrors();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(translateError(error.message));
        return;
      }
      toast.success("Bem-vindo de volta!");
      navigate(from, { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = signupSchema.safeParse({ email, password, name, orgName });
    if (!result.success) {
      const errs: FormErrors = {};
      result.error.issues.forEach((i) => { const f = i.path[0] as keyof FormErrors; if (!errs[f]) errs[f] = i.message; });
      setFieldErrors(errs);
      return;
    }
    if (!acceptedTerms) {
      toast.error("É necessário aceitar os Termos de Uso e a Política de Privacidade");
      return;
    }
    clearErrors();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { name: name.trim(), org_name: orgName.trim() },
        },
      });
      if (error) {
        toast.error(translateError(error.message));
        return;
      }
      if (data.session) {
        toast.success("Conta criada com sucesso!");
        navigate("/", { replace: true });
      } else {
        setMode("check_email");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = forgotSchema.safeParse({ email });
    if (!result.success) {
      setFieldErrors({ email: result.error.issues[0]?.message });
      return;
    }
    clearErrors();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast.error(translateError(error.message));
        return;
      }
      setMode("check_email");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (mode === "signup" && !acceptedTerms) {
      toast.error("É necessário aceitar os Termos de Uso e a Política de Privacidade");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) {
        toast.error("Não foi possível entrar com Google");
        setLoading(false);
      }
      // On success, browser redirects — loading stays true intentionally
    } catch {
      toast.error("Não foi possível entrar com Google");
      setLoading(false);
    }
  };

  const subtitle: Record<Mode, string> = {
    login: "Entre na sua conta",
    signup: "Crie sua organização",
    forgot: "Recuperar senha",
    check_email: "Verifique seu email",
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center mb-3">
            <span className="font-cormorant text-3xl font-semibold text-primary-foreground leading-none select-none">P</span>
          </div>
          <h1 className="font-cormorant text-3xl font-light tracking-wider">Ponderum</h1>
          <p className="text-xs text-muted-foreground tracking-wide mt-0.5">Inteligência contratual</p>
          <p className="text-sm text-muted-foreground mt-2">{subtitle[mode]}</p>
        </div>

        <Card className="p-6">
          {/* Check email screen */}
          {mode === "check_email" && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">Email enviado</p>
                <p className="text-sm text-muted-foreground">
                  Verifique sua caixa de entrada em <span className="font-medium text-foreground">{email}</span> e siga as instruções.
                </p>
              </div>
              <div className="flex flex-col gap-2 w-full pt-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => { setMode("login"); }}
                >
                  Voltar ao login
                </Button>
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Não recebeu? Tentar novamente
                </button>
              </div>
            </div>
          )}

          {/* Forgot password form */}
          {mode === "forgot" && (
            <form onSubmit={handleForgot} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Digite seu email e enviaremos um link para redefinir sua senha.
              </p>
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="voce@empresa.com" value={email}
                  onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoFocus
                  className={fieldErrors.email ? "border-destructive/70" : ""}
                />
                {fieldErrors.email && <p className="text-[11px] text-destructive">{fieldErrors.email}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Enviar link de recuperação
              </Button>
              <button
                type="button"
                onClick={() => setMode("login")}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
              >
                ← Voltar ao login
              </button>
            </form>
          )}

          {/* Login / Signup form */}
          {(mode === "login" || mode === "signup") && (
            <>
              <form onSubmit={mode === "login" ? handleEmailLogin : handleSignup} className="space-y-4">
                {mode === "signup" && (
                  <>
                    <div className="space-y-1">
                      <Label htmlFor="name">Seu nome</Label>
                      <Input id="name" type="text" placeholder="Maria Silva" value={name}
                        onChange={(e) => setName(e.target.value)} autoComplete="name"
                        className={fieldErrors.name ? "border-destructive/70" : ""}
                      />
                      {fieldErrors.name && <p className="text-[11px] text-destructive">{fieldErrors.name}</p>}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="orgName">Nome da organização</Label>
                      <Input id="orgName" type="text" placeholder="Acme Advocacia" value={orgName}
                        onChange={(e) => setOrgName(e.target.value)} autoComplete="organization"
                        className={fieldErrors.orgName ? "border-destructive/70" : ""}
                      />
                      {fieldErrors.orgName && <p className="text-[11px] text-destructive">{fieldErrors.orgName}</p>}
                    </div>
                  </>
                )}

                <div className="space-y-1">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="voce@empresa.com" value={email}
                    onChange={(e) => setEmail(e.target.value)} autoComplete="email"
                    className={fieldErrors.email ? "border-destructive/70" : ""}
                  />
                  {fieldErrors.email && <p className="text-[11px] text-destructive">{fieldErrors.email}</p>}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Senha</Label>
                    {mode === "login" && (
                      <button type="button" onClick={() => setMode("forgot")}
                        className="text-xs text-muted-foreground hover:text-primary transition-colors">
                        Esqueceu a senha?
                      </button>
                    )}
                  </div>
                  <Input id="password" type="password" placeholder="••••••••" value={password}
                    onChange={(e) => setPassword(e.target.value)} minLength={6}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    className={fieldErrors.password ? "border-destructive/70" : ""}
                  />
                  {fieldErrors.password && <p className="text-[11px] text-destructive">{fieldErrors.password}</p>}
                </div>

                {mode === "signup" && (
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

                <Button type="submit" className="w-full" disabled={loading || (mode === "signup" && !acceptedTerms)}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {mode === "login" ? "Entrar" : "Criar conta"}
                </Button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card px-2 text-muted-foreground">ou</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGoogle}
                disabled={loading || (mode === "signup" && !acceptedTerms)}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                )}
                Continuar com Google
              </Button>

              <p className="text-center text-sm text-muted-foreground mt-6">
                {mode === "login" ? (
                  <>
                    Não tem conta?{" "}
                    <button
                      type="button"
                      onClick={() => setMode("signup")}
                      className="text-primary font-medium hover:underline"
                    >
                      Criar conta
                    </button>
                  </>
                ) : (
                  <>
                    Já tem conta?{" "}
                    <button
                      type="button"
                      onClick={() => setMode("login")}
                      className="text-primary font-medium hover:underline"
                    >
                      Entrar
                    </button>
                  </>
                )}
              </p>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
