import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/components/AuthProvider";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { CheckEmailView } from "@/components/auth/CheckEmailView";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { RecoveryCodeForm } from "@/components/auth/RecoveryCodeForm";
import { LoginSignupForm } from "@/components/auth/LoginSignupForm";
import { loginSchema, signupSchema, forgotSchema, recoveryCodeSchema, translateAuthError, type Mode, type FormErrors } from "@/lib/authForm";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, loading: authLoading } = useAuth();
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
        toast.error(translateAuthError(error.message));
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
    const result = signupSchema.safeParse({ email, password, name, orgName, phone, cnpj });
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
          data: { name: name.trim(), social_name: socialName.trim() || null, org_name: orgName.trim(), phone: `${ddi.trim()} ${phone.trim()}`, cnpj: cnpj.trim() || null, terms_accepted: true },
        },
      });
      if (error) {
        toast.error(translateAuthError(error.message));
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
    signup: "Crie sua organização",
    forgot: "Recuperar senha",
    check_email: "Verifique seu email",
    recovery_code: "Digite o código recebido",
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <img src="/ponderum-icon-white.png" alt="Ponderum" className="h-12 w-12 mb-3 object-contain" />
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

          {(mode === "login" || mode === "signup") && (
            <LoginSignupForm
              mode={mode}
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
      </div>
    </div>
  );
}
