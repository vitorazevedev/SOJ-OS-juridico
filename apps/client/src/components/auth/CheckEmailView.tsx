import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";

export function CheckEmailView({
  email,
  onBackToLogin,
  onRetry,
}: {
  email: string;
  onBackToLogin: () => void;
  onRetry: () => void;
}) {
  return (
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
        <Button variant="outline" className="w-full" onClick={onBackToLogin}>
          Voltar ao login
        </Button>
        <button
          type="button"
          onClick={onRetry}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Não recebeu? Tentar novamente
        </button>
      </div>
    </div>
  );
}
