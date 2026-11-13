import { Calendar, Banknote, Users } from "lucide-react";
import { formatBRL, formatDateShort } from "@/lib/contractListFormat";
import type { ParsedData } from "@/hooks/useContracts";

export function ParsedChips({ data }: { data: ParsedData }) {
  const chips: { icon: typeof Calendar; label: string }[] = [];
  const dateLabel = formatDateShort(data.signing_date ?? data.start_date);
  if (dateLabel) chips.push({ icon: Calendar, label: dateLabel });
  if (data.contract_value_brl) chips.push({ icon: Banknote, label: formatBRL(data.contract_value_brl) });
  if (data.parties.length > 1) chips.push({ icon: Users, label: `${data.parties.length} partes` });
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {chips.map(({ icon: Icon, label }) => (
        <span key={label} className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/40 rounded px-1.5 py-0.5">
          <Icon className="h-2.5 w-2.5" />
          {label}
        </span>
      ))}
    </div>
  );
}
