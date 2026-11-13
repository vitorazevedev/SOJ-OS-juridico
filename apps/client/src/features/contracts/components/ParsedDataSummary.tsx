import { Banknote, Calendar, List, Users } from "lucide-react";
import { SojCard } from "@/components/layout/Primitives";
import type { ParsedData } from "@/hooks/useContractAnalysis";

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

export function ParsedDataSummary({ data }: { data: ParsedData }) {
  const fmtValue = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  const rows: { icon: typeof Calendar; label: string; value: string }[] = [];

  if (data.parties.length > 0)
    rows.push({ icon: Users, label: "Partes", value: data.parties.join(" · ") });

  const dateLabel = data.signing_date || data.start_date;
  if (dateLabel) rows.push({ icon: Calendar, label: "Assinatura / Vigência", value: fmtDate(dateLabel) });
  if (data.end_date) rows.push({ icon: Calendar, label: "Término", value: fmtDate(data.end_date) });
  if (data.term_description) rows.push({ icon: Calendar, label: "Prazo", value: data.term_description });
  if (data.contract_value_brl) rows.push({ icon: Banknote, label: "Valor", value: fmtValue(data.contract_value_brl) });

  if (rows.length === 0 && data.key_clauses.length === 0) return null;

  return (
    <SojCard className="flex flex-col gap-3">
      <h3 className="font-medium text-sm flex items-center gap-2">
        <List className="h-4 w-4 text-muted-foreground" /> Dados Extraídos pelo Parsing
      </h3>
      {rows.length > 0 && (
        <dl className="text-sm space-y-2.5 divide-y divide-border">
          {rows.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-start justify-between gap-3 pt-2.5 first:pt-0">
              <dt className="flex items-center gap-1.5 text-muted-foreground shrink-0">
                <Icon className="h-3.5 w-3.5" /> {label}
              </dt>
              <dd className="text-right text-xs max-w-[55%]">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {data.key_clauses.length > 0 && (
        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2">Cláusulas identificadas</p>
          <div className="flex flex-wrap gap-1.5">
            {data.key_clauses.map((cl) => (
              <span key={cl} className="text-[11px] px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground">
                {cl}
              </span>
            ))}
          </div>
        </div>
      )}
    </SojCard>
  );
}
