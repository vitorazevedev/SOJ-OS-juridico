import { TEMPLATES } from "@/data/soj";
import { SojCard } from "@/components/layout/Primitives";
import { cn } from "@/lib/utils";

export function TemplateStep({
  selected,
  onSelect,
  onNext,
}: {
  selected: string | null;
  onSelect: (id: string) => void;
  onNext: () => void;
}) {
  return (
    <SojCard className="flex flex-col gap-4">
      <h3 className="font-medium text-sm md:text-base">Selecione o tipo de contrato</h3>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 md:gap-3">
        {TEMPLATES.map((t, i) => {
          const active = selected === t.id;
          const isLastOdd = TEMPLATES.length % 2 === 1 && i === TEMPLATES.length - 1;
          return (
            <button
              key={t.id}
              onClick={() => onSelect(t.id)}
              className={cn(
                "text-left rounded-xl border transition-all active:opacity-80 p-4 md:p-5",
                isLastOdd && "col-span-2 lg:col-span-1",
              )}
              style={
                active
                  ? { borderColor: "rgba(0,229,160,0.35)", background: "rgba(0,229,160,0.08)" }
                  : { borderColor: "hsl(var(--border))", background: "hsl(var(--card))" }
              }
            >
              <div className="text-[22px] md:text-2xl mb-2">{t.icon}</div>
              <p className="font-medium text-[13px] md:text-sm mb-1">{t.title}</p>
              <p className="text-[11px] md:text-xs text-muted-foreground leading-relaxed">{t.desc}</p>
              {active && <p className="text-[11px] md:text-xs text-primary font-medium mt-2">✓ Selecionado</p>}
            </button>
          );
        })}
      </div>
      <button
        disabled={!selected}
        onClick={() => selected && onNext()}
        className={cn(
          "self-stretch md:self-start h-11 md:h-10 px-6 rounded-lg text-sm font-medium transition-all active:opacity-80",
          selected
            ? "bg-primary text-primary-foreground hover:opacity-90"
            : "bg-muted text-muted-foreground cursor-not-allowed",
        )}
      >
        Continuar →
      </button>
    </SojCard>
  );
}
