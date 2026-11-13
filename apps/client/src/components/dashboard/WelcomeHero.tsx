import { CalendarClock, ShieldCheck, Sparkles, TrendingUp, Upload } from "lucide-react";

export function WelcomeHero({ onUpload, onGenerate }: { onUpload: () => void; onGenerate: () => void }) {
  return (
    <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-background to-background p-6 md:p-8">
      <div className="max-w-2xl">
        <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-3">Primeiros passos</p>
        <h2 className="text-xl md:text-2xl font-semibold leading-snug">
          Seu portfólio jurídico começa aqui
        </h2>
        <p className="text-sm text-muted-foreground mt-2 mb-6 leading-relaxed">
          Faça upload de um contrato ou gere um novo documento para começar a monitorar riscos, prazos e exposição financeira em tempo real.
        </p>

        <div className="flex flex-wrap gap-3 mb-8">
          <button
            onClick={onUpload}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-background text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Upload className="h-4 w-4" />
            Enviar contrato
          </button>
          <button
            onClick={onGenerate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted/40 transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            Gerar contrato
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: ShieldCheck, title: "Análise de risco", desc: "Score 0-100 por cláusula com recomendações jurídicas" },
            { icon: TrendingUp, title: "Impacto financeiro", desc: "Exposição em R$ por cláusula crítica identificada" },
            { icon: CalendarClock, title: "Alertas de prazo", desc: "Notificações 30, 15 e 7 dias antes do vencimento" },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex gap-3 p-3 rounded-xl bg-muted/20 border border-border/50">
              <div className="mt-0.5 h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">{title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
