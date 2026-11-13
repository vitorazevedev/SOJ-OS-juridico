import { useEffect, useState } from "react";
import { ThumbsUp, ThumbsDown, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/components/AuthProvider";
import { cn } from "@/lib/utils";

const DELAY_MS = 45_000;
const AUTO_DISMISS_MS = 30_000;
const STORAGE_KEY = (id: string) => `ponderum:analysis_feedback:${id}`;

export function AnalysisFeedbackPrompt({ analysisId, orgId }: { analysisId: string; orgId: string }) {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [answer, setAnswer] = useState<"sim" | "nao" | null>(null);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  // Mostra após DELAY_MS se ainda não foi respondido
  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY(analysisId))) return;
    const show = setTimeout(() => setVisible(true), DELAY_MS);
    return () => clearTimeout(show);
  }, [analysisId]);

  // Auto-dismiss se o usuário não interagir
  useEffect(() => {
    if (!visible || answer !== null) return;
    const dismiss = setTimeout(() => setVisible(false), AUTO_DISMISS_MS);
    return () => clearTimeout(dismiss);
  }, [visible, answer]);

  const dismiss = () => setVisible(false);

  const submit = async (vote: "sim" | "nao") => {
    setAnswer(vote);
    // Se "sim", envia direto; se "não", aguarda comentário opcional
    if (vote === "sim") await send(vote, "");
  };

  const send = async (vote: string, msg: string) => {
    setSending(true);
    const message = `[análise] ${vote === "sim" ? "Sim" : "Não"}${msg ? `: ${msg}` : ""}`;
    await supabase.from("user_feedback").insert({
      org_id:  orgId,
      user_id: user?.id ?? null,
      category: "utilidade",
      message,
      page_url: window.location.pathname,
    });
    setSending(false);
    localStorage.setItem(STORAGE_KEY(analysisId), "1");
    setDone(true);
    setTimeout(() => setVisible(false), 2000);
  };

  const submitComment = () => send(answer ?? "nao", comment.trim());

  if (!visible) return null;

  return (
    <div className={cn(
      "fixed bottom-20 left-1/2 -translate-x-1/2 z-40 w-full max-w-sm",
      "bg-card border border-border rounded-2xl shadow-xl px-5 py-4",
      "animate-fade-in"
    )}>
      {done ? (
        <p className="text-sm text-center text-primary font-medium py-1">Obrigado pelo feedback!</p>
      ) : answer === "nao" ? (
        /* Tela de comentário opcional */
        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">O que poderia ter sido melhor? <span className="text-muted-foreground/60">(opcional)</span></p>
          <textarea
            autoFocus
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Ex: Não identificou a cláusula de reajuste..."
            rows={2}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs resize-none focus:outline-none focus:border-primary/60 transition-colors"
          />
          <div className="flex gap-2 justify-end">
            <button onClick={dismiss} className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg transition-colors">Pular</button>
            <button
              onClick={submitComment}
              disabled={sending}
              className="text-xs bg-primary text-primary-foreground px-4 py-1.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {sending ? "Enviando..." : "Enviar"}
            </button>
          </div>
        </div>
      ) : (
        /* Pergunta principal */
        <div className="flex items-center gap-3">
          <p className="text-sm flex-1 leading-tight">As cláusulas identificadas fazem sentido para você?</p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => submit("sim")}
              className="flex items-center gap-1.5 h-8 px-3 rounded-xl bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
            >
              <ThumbsUp className="h-3.5 w-3.5" /> Sim
            </button>
            <button
              onClick={() => submit("nao")}
              className="flex items-center gap-1.5 h-8 px-3 rounded-xl bg-muted text-muted-foreground text-xs font-medium hover:bg-muted/70 transition-colors"
            >
              <ThumbsDown className="h-3.5 w-3.5" /> Não
            </button>
            <button onClick={dismiss} className="text-muted-foreground hover:text-foreground transition-colors ml-1">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
