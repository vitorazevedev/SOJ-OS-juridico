import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Loader2, KeyRound } from "lucide-react";

export function RecoveryCodeForm({
  email,
  code,
  setCode,
  loading,
  onSubmit,
  onResend,
  onBackToLogin,
}: {
  email: string;
  code: string;
  setCode: (v: string) => void;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onResend: () => void;
  onBackToLogin: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col items-center gap-4 py-2 text-center">
      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
        <KeyRound className="h-6 w-6 text-primary" />
      </div>
      <div className="space-y-1">
        <p className="font-medium">Digite o código de verificação</p>
        <p className="text-sm text-muted-foreground">
          Enviamos um código de 6 dígitos para <span className="font-medium text-foreground">{email}</span>
        </p>
      </div>

      <InputOTP maxLength={6} value={code} onChange={setCode} autoFocus>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
          <InputOTPSlot index={3} />
          <InputOTPSlot index={4} />
          <InputOTPSlot index={5} />
        </InputOTPGroup>
      </InputOTP>

      <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Verificar código
      </Button>

      <div className="flex flex-col gap-2 w-full">
        <button
          type="button"
          onClick={onResend}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Não recebeu? Reenviar código
        </button>
        <button
          type="button"
          onClick={onBackToLogin}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Voltar ao login
        </button>
      </div>
    </form>
  );
}
