export function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function urgencyMeta(days: number | null, status: string) {
  if (status === "cumprida")
    return { dot: "bg-primary", chip: "bg-primary-dim text-primary", label: "Cumprida", date: "text-muted-foreground" };
  if (days === null)
    return { dot: "bg-muted-foreground", chip: "bg-muted text-muted-foreground", label: "Sem data", date: "text-muted-foreground" };
  if (days < 0 || status === "atrasada")
    return { dot: "bg-risk-critical", chip: "bg-risk-critical-dim text-risk-critical", label: "Vencida", date: "text-risk-critical" };
  if (days <= 1)
    return { dot: "bg-risk-critical", chip: "bg-risk-critical-dim text-risk-critical", label: days === 0 ? "Hoje" : "Amanhã", date: "text-risk-critical" };
  if (days <= 7)
    return { dot: "bg-risk-medium", chip: "bg-risk-medium-dim text-risk-medium", label: "≤ 7 dias", date: "text-risk-medium" };
  if (days <= 15)
    return { dot: "bg-yellow-500", chip: "bg-yellow-500/10 text-yellow-500", label: "≤ 15 dias", date: "text-yellow-500" };
  if (days <= 30)
    return { dot: "bg-info", chip: "bg-info/10 text-info", label: "≤ 30 dias", date: "text-info" };
  return { dot: "bg-primary", chip: "bg-primary-dim text-primary", label: "No prazo", date: "text-primary" };
}

export function formatBRL(cents: number | null) {
  if (cents == null) return null;
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDate(d: string | null) {
  if (!d) return "Sem data";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function responsibleLabel(r: string | null) {
  if (!r) return "—";
  const map: Record<string, string> = { parte_a: "Parte A", parte_b: "Parte B", ambas: "Ambas" };
  return map[r] ?? r;
}

export function obligationTypeLabel(t: string | null) {
  const map: Record<string, string> = {
    pagamento: "Pagamento", entrega: "Entrega", notificacao: "Notificação",
    renovacao: "Renovação", reajuste: "Reajuste", outro: "Outro",
  };
  return t ? (map[t] ?? t) : null;
}
