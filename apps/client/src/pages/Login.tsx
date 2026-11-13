import { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/components/AuthProvider";
import { useTheme } from "@/hooks/useTheme";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { CheckEmailView } from "@/components/auth/CheckEmailView";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { RecoveryCodeForm } from "@/components/auth/RecoveryCodeForm";
import { LoginSignupForm } from "@/components/auth/LoginSignupForm";
import { loginSchema, signupSchema, inviteSignupSchema, forgotSchema, recoveryCodeSchema, translateAuthError, type Mode, type FormErrors } from "@/lib/authForm";
import { getSupportWhatsapp, buildWaLink } from "@/lib/supportWhatsapp";

const POST_AUTH_REDIRECT_KEY = "ponderum:post_auth_redirect";

function consumePostAuthRedirect(): string | null {
  try {
    const value = localStorage.getItem(POST_AUTH_REDIRECT_KEY);
    if (value) localStorage.removeItem(POST_AUTH_REDIRECT_KEY);
    return value;
  } catch {
    return null;
  }
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { session, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [socialName, setSocialName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [ddi, setDdi] = useState("+55");
  const [phone, setPhone] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");

  const inviteToken = searchParams.get("invite");
  const [inviteInfo, setInviteInfo] = useState<{ valid: boolean; email?: string; organization_name?: string } | null>(null);

  const clearErrors = () => setFieldErrors({});

  const from = (location.state as { from?: { pathname: string; search: string } } | null)?.from;
  const fromPath = from ? `${from.pathname}${from.search ?? ""}` : "/";

  useEffect(() => {
    // Link de plano vindo da landing (?plan=X) ou redirecionamento de rota
    // protegida -- grava a intenção ANTES de autenticar, pra sobreviver a
    // um desvio de página inteira (confirmação por e-mail, OAuth do Google).
    const plan = searchParams.get("plan");
    try {
      if (plan) {
        localStorage.setItem(POST_AUTH_REDIRECT_KEY, `/checkout?plan=${encodeURIComponent(plan)}`);
      } else if (from) {
        localStorage.setItem(POST_AUTH_REDIRECT_KEY, fromPath);
      }
    } catch {
      // localStorage indisponível -- segue sem persistir
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!inviteToken) return;
    setMode("signup");
    supabase.functions.invoke("org-invite-info", { body: { token: inviteToken } }).then(({ data }) => {
      const info = data as { valid: boolean; email?: string; organization_name?: string } | null;
      setInviteInfo(info ?? { valid: false });
      if (info?.valid && info.email) setEmail(info.email);
    });
  }, [inviteToken]);

  useEffect(() => {
    if (!authLoading && session) navigate(consumePostAuthRedirect() ?? fromPath, { replace: true });
  }, [session, authLoading, navigate, fromPath]);

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
        toast.error(translateAuthError(error.message));
        return;
      }
      toast.success("Bem-vindo de volta!");
      navigate(consumePostAuthRedirect() ?? fromPath, { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const isInviteSignup = !!inviteToken && inviteInfo?.valid === true;

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = isInviteSignup
      ? inviteSignupSchema.safeParse({ email, password, name, phone })
      : signupSchema.safeParse({ email, password, name, orgName, phone, cnpj });
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
          data: isInviteSignup
            ? { name: name.trim(), social_name: socialName.trim() || null, phone: `${ddi.trim()} ${phone.trim()}`, terms_accepted: true, invite_token: inviteToken }
            : { name: name.trim(), social_name: socialName.trim() || null, org_name: orgName.trim(), phone: `${ddi.trim()} ${phone.trim()}`, cnpj: cnpj.trim() || null, terms_accepted: true },
        },
      });
      if (error) {
        toast.error(translateAuthError(error.message));
        return;
      }
      if (data.session) {
        toast.success("Conta criada com sucesso!");
        navigate(consumePostAuthRedirect() ?? fromPath, { replace: true });
      } else {
        setMode("check_email");
      }
    } finally {
      setLoading(false);
    }
  };

  const sendRecoveryEmail = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast.error(translateAuthError(error.message));
        return;
      }
      setRecoveryCode("");
      setMode("recovery_code");
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
    await sendRecoveryEmail();
  };

  const handleVerifyRecoveryCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = recoveryCodeSchema.safeParse({ code: recoveryCode });
    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? "Código inválido");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token: recoveryCode, type: "recovery" });
      if (error) {
        toast.error(translateAuthError(error.message));
        return;
      }
      navigate("/reset-password", { replace: true });
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
    signup: isInviteSignup ? `Você foi convidado para ${inviteInfo?.organization_name ?? "uma organização"}` : "Crie sua organização",
    forgot: "Recuperar senha",
    check_email: "Verifique seu email",
    recovery_code: "Digite o código recebido",
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <img
            src={theme === "light" ? "/ponderum-icon-dark.png" : "/ponderum-icon-white.png"}
            alt="Ponderum"
            className="h-12 w-12 mb-3 object-contain"
          />
          <h1 className="font-cormorant text-3xl font-light tracking-wider">Ponderum</h1>
          <p className="text-xs text-muted-foreground tracking-wide mt-0.5">Inteligência contratual</p>
          <p className="text-sm text-muted-foreground mt-2">{subtitle[mode]}</p>
        </div>

        <Card className="p-6">
          {mode === "check_email" && (
            <CheckEmailView
              email={email}
              onBackToLogin={() => setMode("login")}
              onRetry={() => setMode("forgot")}
            />
          )}

          {mode === "forgot" && (
            <ForgotPasswordForm
              email={email}
              setEmail={setEmail}
              fieldErrors={fieldErrors}
              loading={loading}
              onSubmit={handleForgot}
              onBackToLogin={() => setMode("login")}
            />
          )}

          {mode === "recovery_code" && (
            <RecoveryCodeForm
              email={email}
              code={recoveryCode}
              setCode={setRecoveryCode}
              loading={loading}
              onSubmit={handleVerifyRecoveryCode}
              onResend={sendRecoveryEmail}
              onBackToLogin={() => setMode("login")}
            />
          )}

          {mode === "signup" && inviteToken && inviteInfo && !inviteInfo.valid && (
            <p className="text-xs text-risk-critical mb-4 text-center">
              Esse link de convite não é mais válido. Peça um novo link a quem te convidou, ou crie sua própria organização abaixo.
            </p>
          )}

          {(mode === "login" || mode === "signup") && (
            <LoginSignupForm
              mode={mode}
              hideOrgFields={isInviteSignup}
              emailLocked={isInviteSignup}
              name={name}
              setName={setName}
              socialName={socialName}
              setSocialName={setSocialName}
              orgName={orgName}
              setOrgName={setOrgName}
              ddi={ddi}
              setDdi={setDdi}
              phone={phone}
              setPhone={setPhone}
              cnpj={cnpj}
              setCnpj={setCnpj}
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              acceptedTerms={acceptedTerms}
              setAcceptedTerms={setAcceptedTerms}
              fieldErrors={fieldErrors}
              loading={loading}
              onSubmit={mode === "login" ? handleEmailLogin : handleSignup}
              onForgotClick={() => setMode("forgot")}
              onGoogleClick={handleGoogle}
              onToggleMode={() => setMode(mode === "login" ? "signup" : "login")}
            />
          )}
        </Card>

        <button
          type="button"
          onClick={() => {
            getSupportWhatsapp().then((number) => {
              window.open(
                buildWaLink(number, "Olá! Preciso de ajuda pra acessar minha conta na Ponderum."),
                "_blank",
              );
            });
          }}
          className="text-xs text-muted-foreground underline w-full text-center mt-4"
        >
          Preciso de ajuda com o acesso
        </button>
      </div>
    </div>
  );
}
