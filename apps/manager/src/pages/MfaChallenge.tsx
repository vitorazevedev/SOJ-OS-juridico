import { useEffect, useState } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { Button, Input, Label, SojCard } from "@ponderum/ui";
import { supabase } from "@/lib/supabase";

export default function MfaChallenge() {
  const navigate = useNavigate();
  const location = useLocation();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data, error: listError }) => {
      const verified = data?.totp.find((f) => f.status === "verified");
      if (listError || !verified) {
        setLoading(false);
        return;
      }
      setFactorId(verified.id);
      setLoading(false);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setError(null);
    setSubmitting(true);
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError || !challenge) {
      setError("Falha ao gerar o desafio. Tente novamente.");
      setSubmitting(false);
      return;
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    });
    setSubmitting(false);
    if (verifyError) {
      setError("Código inválido. Confira o app autenticador e tente de novo.");
      return;
    }
    const from = (location.state as { from?: Location })?.from;
    navigate(from?.pathname ?? "/", { replace: true });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!factorId) {
    return <Navigate to="/mfa/enroll" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <SojCard className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Confirme sua identidade</h1>
          <p className="text-sm text-muted-foreground">
            Digite o código de 6 dígitos do seu app autenticador pra continuar.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="code">Código do autenticador</Label>
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              autoFocus
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting || code.length !== 6}>
            {submitting ? "Verificando..." : "Confirmar"}
          </Button>
        </form>
      </SojCard>
    </div>
  );
}
