import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { Button, Input, Label, SojCard } from "@ponderum/ui";
import { supabase } from "@/lib/supabase";

export default function MfaEnroll() {
  const navigate = useNavigate();
  const location = useLocation();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const enrollStarted = useRef(false);

  useEffect(() => {
    if (enrollStarted.current) return;
    enrollStarted.current = true;
    supabase.auth.mfa.enroll({ factorType: "totp" }).then(({ data, error: enrollError }) => {
      if (enrollError || !data) {
        setError("Não foi possível iniciar o cadastro do autenticador. Tente recarregar a página.");
        setLoading(false);
        return;
      }
      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
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

  if (!factorId || !qrCode) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <SojCard className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Configure o autenticador</h1>
          <p className="text-sm text-muted-foreground">
            MFA é obrigatório pra qualquer conta da equipe. Escaneie o QR code com um app como Google
            Authenticator ou Authy, depois digite o código de 6 dígitos.
          </p>
        </div>
        <div
          className="mx-auto w-48 h-48 bg-white rounded-md p-2"
          // qr_code vem como markup SVG direto da API do Supabase Auth
          dangerouslySetInnerHTML={{ __html: qrCode }}
        />
        {secret && (
          <p className="text-xs text-muted-foreground break-all text-center">
            Não consegue escanear? Digite manualmente: <span className="font-mono">{secret}</span>
          </p>
        )}
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
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting || code.length !== 6}>
            {submitting ? "Confirmando..." : "Confirmar e ativar"}
          </Button>
        </form>
      </SojCard>
    </div>
  );
}
