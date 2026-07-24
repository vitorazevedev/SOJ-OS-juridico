import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import type { FormErrors, Mode } from "@/lib/authForm";
import { formatDocument } from "@/lib/brazilianDocs";

// Agrupa dígitos em blocos de 3 (ex: "447 911 123 456") — não é o formato
// oficial de nenhum país específico, só uma leitura genérica mais limpa
// que um bloco corrido de números.
function maskGeneric(d: string): string {
  const parts: string[] = [];
  for (let i = 0; i < d.length; i += 3) parts.push(d.slice(i, i + 3));
  return parts.join(" ");
}

// Máscara (XX) XXXXX-XXXX só faz sentido para números brasileiros. Para
// qualquer outro DDI, agrupamos os dígitos de forma genérica, sem inventar
// um formato que não é o real do país escolhido.
function maskPhone(v: string, ddi: string): string {
  const d = v.replace(/\D/g, "");
  if (ddi.trim() !== "+55") return maskGeneric(d.slice(0, 15));
  const dd = d.slice(0, 11);
  if (!dd) return "";
  if (dd.length <= 2) return `(${dd}`;
  if (dd.length <= 6) return `(${dd.slice(0, 2)}) ${dd.slice(2)}`;
  if (dd.length <= 10) return `(${dd.slice(0, 2)}) ${dd.slice(2, 6)}-${dd.slice(6)}`;
  return `(${dd.slice(0, 2)}) ${dd.slice(2, 7)}-${dd.slice(7)}`;
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export function LoginSignupForm({
  mode,
  name,
  setName,
  socialName,
  setSocialName,
  orgName,
  setOrgName,
  ddi,
  setDdi,
  phone,
  setPhone,
  cnpj,
  setCnpj,
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  acceptedTerms,
  setAcceptedTerms,
  fieldErrors,
  loading,
  onSubmit,
  onForgotClick,
  onGoogleClick,
  onToggleMode,
}: {
  mode: Extract<Mode, "login" | "signup">;
  name: string;
  setName: (v: string) => void;
  socialName: string;
  setSocialName: (v: string) => void;
  orgName: string;
  setOrgName: (v: string) => void;
  ddi: string;
  setDdi: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  cnpj: string;
  setCnpj: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean | ((prev: boolean) => boolean)) => void;
  acceptedTerms: boolean;
  setAcceptedTerms: (v: boolean) => void;
  fieldErrors: FormErrors;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onForgotClick: () => void;
  onGoogleClick: () => void;
  onToggleMode: () => void;
}) {
  return (
    <>
      <form onSubmit={onSubmit} className="space-y-4">
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
              <Label htmlFor="socialName">Nome social</Label>
              <Input id="socialName" type="text" placeholder="Opcional" value={socialName}
                onChange={(e) => setSocialName(e.target.value)} autoComplete="off"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="orgName">Nome da organização</Label>
              <Input id="orgName" type="text" placeholder="Acme Advocacia" value={orgName}
                onChange={(e) => setOrgName(e.target.value)} autoComplete="organization"
                className={fieldErrors.orgName ? "border-destructive/70" : ""}
              />
              {fieldErrors.orgName && <p className="text-[11px] text-destructive">{fieldErrors.orgName}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">WhatsApp / Celular</Label>
              <div className="flex gap-2">
                <Input id="ddi" type="text" value={ddi} aria-label="DDI (código do país)"
                  onChange={(e) => {
                    const newDdi = `+${e.target.value.replace(/\D/g, "").slice(0, 4)}`;
                    setDdi(newDdi);
                    setPhone(maskPhone(phone, newDdi));
                  }}
                  maxLength={5} className="w-16 shrink-0 text-center px-1"
                />
                <Input id="phone" type="tel" placeholder="(11) 99999-9999" value={phone}
                  onChange={(e) => setPhone(maskPhone(e.target.value, ddi))} autoComplete="tel" maxLength={15}
                  className={fieldErrors.phone ? "border-destructive/70 flex-1" : "flex-1"}
                />
              </div>
              {fieldErrors.phone && <p className="text-[11px] text-destructive">{fieldErrors.phone}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="cnpj">CPF ou CNPJ</Label>
              <Input id="cnpj" type="text" placeholder="000.000.000-00 ou 00.000.000/0000-00" value={cnpj}
                onChange={(e) => setCnpj(formatDocument(e.target.value))} autoComplete="off" maxLength={18}
                className={fieldErrors.cnpj ? "border-destructive/70" : ""}
              />
              {fieldErrors.cnpj && <p className="text-[11px] text-destructive">{fieldErrors.cnpj}</p>}
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
              <button type="button" onClick={onForgotClick}
                className="text-xs text-muted-foreground hover:text-primary transition-colors">
                Esqueceu a senha?
              </button>
            )}
          </div>
          <div className="relative">
            <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password}
              onChange={(e) => setPassword(e.target.value)} minLength={6}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className={`pr-10 ${fieldErrors.password ? "border-destructive/70" : ""}`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
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
        onClick={onGoogleClick}
        disabled={loading || (mode === "signup" && !acceptedTerms)}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
        Continuar com Google
      </Button>

      <p className="text-center text-sm text-muted-foreground mt-6">
        {mode === "login" ? (
          <>
            Não tem conta?{" "}
            <button type="button" onClick={onToggleMode} className="text-primary font-medium hover:underline">
              Criar conta
            </button>
          </>
        ) : (
          <>
            Já tem conta?{" "}
            <button type="button" onClick={onToggleMode} className="text-primary font-medium hover:underline">
              Entrar
            </button>
          </>
        )}
      </p>
    </>
  );
}
