import type { DbContract } from "@/hooks/useContracts";

export type SortField = "name" | "created_at" | "risk_score";
export type SortDir = "asc" | "desc";

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

export const initialsFor = (c: DbContract) => {
  const src = c.party || c.name || "??";
  return src.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase() || "C";
};

export const formatBRL = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export const formatDateShort = (iso: string | null) => {
  if (!iso) return null;
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
  } catch {
    return null;
  }
};

export function applySort(list: DbContract[], field: SortField, dir: SortDir): DbContract[] {
  return [...list].sort((a, b) => {
    let cmp = 0;
    if (field === "name") {
      cmp = a.name.localeCompare(b.name, "pt-BR");
    } else if (field === "created_at") {
      cmp = a.created_at.localeCompare(b.created_at);
    } else if (field === "risk_score") {
      cmp = (a.risk_score ?? -1) - (b.risk_score ?? -1);
    }
    return dir === "asc" ? cmp : -cmp;
  });
}
