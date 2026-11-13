import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Copy, Check } from "lucide-react";
import { Button, Input, Label, SojCard } from "@ponderum/ui";
import { supabase } from "@/lib/supabase";

// Data em que o MFA passou a ser obrigatorio -- quem ja era staff antes
// disso ve o aviso de que isso e uma mudanca; quem foi cadastrado depois
// so ve a politica direto, sem soar como novidade pra quem nunca usou o
// sistema sem MFA.
const MFA_ROLLOUT_DATE = "2026-11-13";

export default function MfaEnroll() {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState<"totp" | "recovery-codes">("totp");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isPreExisting, setIsPreExisting] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);
  const [codesCopied, setCodesCopied] = useState(false);
  const enrollStarted = useRef(false);

  // Se uma tentativa anterior ficou pela metade (ex.: a pessoa fechou a aba
  // antes de digitar o código), sobra um fator "unverified" que faz o
  // enroll() novo falhar -- limpa esse fator antes de tentar de novo.
  const startEnroll = useCallback(async () => {
    setError(null);
    setLoading(true);
    const { data: factorsData } = await supabase.auth.mfa.listFactors();
    const stale = factorsData?.all.find((f) => f.factor_type === "totp" && f.status === "unverified");
    if (stale) await supabase.auth.mfa.unenroll({ factorId: stale.id });

    const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    if (enrollError || !data) {
      setError("Não foi possível iniciar o cadastro do autenticador. Tente de novo.");
      setLoading(false);
      return;
    }
    setFactorId(data.id);
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (enrollStarted.current) return;
    enrollStarted.current = true;
    startEnroll();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase.from("staff_members").select("created_at").eq("id", user.id).maybeSingle();
      if (data?.created_at) setIsPreExisting(new Date(data.created_at) < new Date(MFA_ROLLOUT_DATE));
    });
  }, [startEnroll]);

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
    if (verifyError) {
      setSubmitting(false);
      setError("Código inválido. Confira o app autenticador e tente de novo.");
      return;
    }

    const { data: recoveryData, error: recoveryError } = await supabase.auth.mfa.recoveryCodes.generate({
      friendlyName: "Códigos de backup",
    });
    setSubmitting(false);
    if (recoveryError || !recoveryData) {
      // Autenticador já está ativo -- segue sem os códigos de backup em vez
      // de travar a pessoa fora da própria conta por causa de um recurso
      // auxiliar que falhou.
      goToDestination();
      return;
    }
    setRecoveryCodes(recoveryData.codes);
    setStep("recovery-codes");
  }

  function goToDestination() {
    const from = (location.state as { from?: Location })?.from;
    navigate(from?.pathname ?? "/", { replace: true });
  }

  if (step === "recovery-codes") {
    const formatted = recoveryCodes.map((c) => c.match(/.{1,4}/g)?.join("-") ?? c);
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <SojCard className="w-full max-w-sm space-y-6">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Guarde seus códigos de backup</h1>
            <p className="text-sm text-muted-foreground">
              Use um desses códigos pra entrar se você perder o acesso ao app autenticador. Cada código
              funciona uma única vez, e eles só aparecem agora — guarde em um lugar seguro.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 rounded-md border border-border bg-muted/40 p-4 font-mono text-xs">
            {formatted.map((c) => (
              <span key={c}>{c}</span>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              navigator.clipboard.writeText(formatted.join("\n"));
              setCodesCopied(true);
              setTimeout(() => setCodesCopied(false), 2000);
            }}
          >
            {codesCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            Copiar todos os códigos
          </Button>
          <Button type="button" className="w-full" onClick={goToDestination}>
            Já guardei meus códigos, continuar
          </Button>
        </SojCard>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!factorId || !qrCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <SojCard className="w-full max-w-sm space-y-4 text-center">
          <p className="text-sm text-destructive">{error ?? "Algo deu errado."}</p>
          <Button onClick={() => startEnroll()} className="w-full">Tentar de novo</Button>
        </SojCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <SojCard className="w-full max-w-sm space-y-6">
        <div className="space-y-3">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Configure o autenticador</h1>
            <p className="text-sm text-muted-foreground">
              {isPreExisting
                ? "A partir de agora, toda conta da equipe Ponderum precisa de um segundo fator de autenticação (MFA) pra entrar, além do email e da senha."
                : "Toda conta da equipe Ponderum precisa de um segundo fator de autenticação (MFA) pra entrar, além do email e da senha."}
            </p>
          </div>
          <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
            <li>Instale um app autenticador no celular, se ainda não tiver um (Google Authenticator, Authy, 1Password...).</li>
            <li>Abra o app e escaneie o QR code abaixo.</li>
            <li>Digite o código de 6 dígitos que o app mostrar.</li>
          </ol>
        </div>
        <img
          src={qrCode}
          alt="QR code para configurar o autenticador"
          className="mx-auto w-48 h-48 bg-white rounded-md p-2"
        />
        {secret && (
          <div className="space-y-1.5 text-center">
            <p className="text-xs text-muted-foreground">Não consegue escanear? Digite manualmente:</p>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(secret);
                setSecretCopied(true);
                setTimeout(() => setSecretCopied(false), 2000);
              }}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 font-mono text-xs break-all hover:bg-muted/70 transition-colors"
            >
              {secret}
              {secretCopied ? <Check className="h-3.5 w-3.5 shrink-0" /> : <Copy className="h-3.5 w-3.5 shrink-0" />}
            </button>
          </div>
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
