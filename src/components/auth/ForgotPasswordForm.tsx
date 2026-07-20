import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import type { FormErrors } from "@/lib/authForm";

export function ForgotPasswordForm({
  email,
  setEmail,
  fieldErrors,
  loading,
  onSubmit,
  onBackToLogin,
}: {
  email: string;
  setEmail: (v: string) => void;
  fieldErrors: FormErrors;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onBackToLogin: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Digite seu email e enviaremos um código de verificação para redefinir sua senha.
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
        Enviar código de recuperação
      </Button>
      <button
        type="button"
        onClick={onBackToLogin}
        className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
      >
        ← Voltar ao login
      </button>
    </form>
  );
}
