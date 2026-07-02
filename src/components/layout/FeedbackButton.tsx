import { useState } from "react";
import { MessageSquarePlus, X, Send } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/components/AuthProvider";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Category = "utilidade" | "erro" | "omissao";

const CATEGORIES: { id: Category; label: string; description: string }[] = [
  { id: "utilidade", label: "Sugestão", description: "Melhoria ou nova funcionalidade" },
  { id: "erro",     label: "Erro",      description: "Algo não funcionou como esperado" },
  { id: "omissao",  label: "Omissão",   description: "Algo que deveria existir mas não existe" },
];

export function FeedbackButton() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const reset = () => { setCategory(null); setMessage(""); };
  const close  = () => { setOpen(false); reset(); };

  const handleSubmit = async () => {
    if (!category || !message.trim() || !user) return;
    setSending(true);

    const { data: userRow } = await supabase
      .from("users")
      .select("org_id")
      .maybeSingle();

    const { error } = await supabase
      .from("user_feedback")
      .insert({
        org_id:   userRow?.org_id ?? null,
        user_id:  user.id,
        category,
        message:  message.trim(),
        page_url: window.location.pathname,
      });

    setSending(false);

    if (error) {
      toast.error("Erro ao enviar feedback. Tente novamente.");
      return;
    }

    toast.success("Feedback enviado. Obrigado!");
    close();
  };

  return (
    <>
      {/* Botão flutuante */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 h-10 px-4 rounded-full bg-primary text-primary-foreground text-xs font-medium shadow-lg hover:opacity-90 transition-all"
        title="Enviar feedback"
      >
        <MessageSquarePlus className="h-4 w-4" />
        <span className="hidden sm:inline">Feedback</span>
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) close(); }}
        >
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 flex flex-col gap-4 shadow-xl animate-fade-in">

            {/* Cabeçalho */}
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-sm">Enviar feedback</p>
                <p className="text-xs text-muted-foreground mt-0.5">Sua opinião melhora o Ponderum</p>
              </div>
              <button onClick={close} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Categorias */}
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors",
                    category === cat.id
                      ? "border-primary bg-primary-dim"
                      : "border-border hover:border-primary/40 hover:bg-muted/30"
                  )}
                >
                  <span className={cn("text-xs font-medium", category === cat.id ? "text-primary" : "text-foreground")}>
                    {cat.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground leading-tight">{cat.description}</span>
                </button>
              ))}
            </div>

            {/* Mensagem */}
            <textarea
              placeholder="Descreva sua experiência com o maior detalhe possível..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-primary/60 transition-colors placeholder:text-muted-foreground/60"
            />

            {/* Ações */}
            <div className="flex justify-end gap-2">
              <button onClick={close} className="h-9 px-4 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={!category || !message.trim() || sending}
                className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity flex items-center gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                {sending ? "Enviando..." : "Enviar"}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
