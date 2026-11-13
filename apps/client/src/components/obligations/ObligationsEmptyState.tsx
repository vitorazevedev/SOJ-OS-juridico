import { Inbox } from "lucide-react";

export function ObligationsEmptyState({ hasAny }: { hasAny: boolean }) {
  return (
    <div className="px-4 py-12 md:py-16 text-center">
      <div className="mx-auto h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
        <Inbox className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">
        {hasAny ? "Nenhuma obrigação com esses filtros" : "Nenhuma obrigação ainda"}
      </p>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
        {hasAny
          ? "Ajuste os filtros para ver mais resultados."
          : "Obrigações são extraídas automaticamente das análises de contratos."}
      </p>
    </div>
  );
}
