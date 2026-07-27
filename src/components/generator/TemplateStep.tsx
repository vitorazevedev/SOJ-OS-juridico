import { useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { CONTRACT_TEMPLATES_CATALOG } from "@/data/contractTemplatesCatalog";
import { SojCard } from "@/components/layout/Primitives";
import { cn } from "@/lib/utils";

// Descrição curta por categoria (pasta) — mesma redação usada antes na tela de
// seleção de tipo de contrato, agora sem emoji.
const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  "Prestação de Serviços": "Contrato padrão para serviços B2B com SLA e cláusulas equilibradas.",
  "NDA / Confidencialidade": "Acordo de não-divulgação mútuo com prazo e exceções padronizadas.",
  "Fornecimento": "Contrato de fornecimento com cláusulas de qualidade e logística.",
  "Licenciamento SaaS": "Licença de uso de software com termos de propriedade intelectual.",
  "Parceria Comercial": "Acordo de parceria estratégica com divisão de receita.",
  "Consultoria": "Contrato de consultoria com entregáveis e milestones definidos.",
};

export function TemplateStep({
  selected,
  onSelect,
  onNext,
}: {
  selected: string | null;
  onSelect: (id: string) => void;
  onNext: () => void;
}) {
  const categories = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const t of CONTRACT_TEMPLATES_CATALOG) {
      if (!seen.has(t.categoria)) {
        seen.add(t.categoria);
        list.push(t.categoria);
      }
    }
    return list;
  }, []);

  const selectedCategory = selected
    ? CONTRACT_TEMPLATES_CATALOG.find((t) => t.id === selected)?.categoria ?? null
    : null;
  const [category, setCategory] = useState<string | null>(selectedCategory);

  // Pasta (categoria) ainda não escolhida — mostra os 6 grupos da biblioteca.
  if (!category) {
    return (
      <SojCard className="flex flex-col gap-4">
        <h3 className="font-medium text-sm md:text-base">Selecione o tipo de contrato</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 md:gap-3">
          {categories.map((cat) => {
            const count = CONTRACT_TEMPLATES_CATALOG.filter((t) => t.categoria === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className="text-left rounded-xl border border-border bg-card transition-all active:opacity-80 p-4 md:p-5 hover:border-primary/30"
              >
                <p className="font-medium text-[13px] md:text-sm mb-1">{cat}</p>
                <p className="text-[11px] md:text-xs text-muted-foreground leading-relaxed mb-2">
                  {CATEGORY_DESCRIPTIONS[cat]}
                </p>
                <p className="text-[10px] text-muted-foreground/70">{count} modelos</p>
              </button>
            );
          })}
        </div>
      </SojCard>
    );
  }

  // Pasta aberta — mostra os modelos daquela categoria.
  const modelsInCategory = CONTRACT_TEMPLATES_CATALOG.filter((t) => t.categoria === category);

  return (
    <SojCard className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setCategory(null)}
          className="inline-flex items-center gap-1 h-8 px-2 -ml-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors shrink-0"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Categorias
        </button>
        <div className="min-w-0">
          <h3 className="font-medium text-sm md:text-base truncate">{category}</h3>
          <p className="text-[10px] md:text-[11px] text-muted-foreground">
            {modelsInCategory.length} modelos da biblioteca jurídica Ponderum
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 md:gap-3">
        {modelsInCategory.map((t) => {
          const active = selected === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onSelect(t.id)}
              className={cn(
                "text-left rounded-xl border transition-all active:opacity-80 p-4 md:p-5",
                active ? "border-primary/35 bg-primary-dim" : "border-border bg-card",
              )}
            >
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">{t.id}</p>
              <p className="font-medium text-[13px] md:text-sm mb-1">{t.titulo}</p>
              <p className="text-[11px] md:text-xs text-muted-foreground leading-relaxed mb-1.5">{t.subtitulo}</p>
              <p className="text-[10px] md:text-[11px] text-muted-foreground/70 leading-relaxed">
                Indicado para {t.casoDeUso}
              </p>
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
