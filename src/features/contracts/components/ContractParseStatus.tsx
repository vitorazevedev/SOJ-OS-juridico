import { StatusBadge } from "@/components/layout/Primitives";

const STATUS_LABELS: Record<string, string> = {
  analisado: "Analisado",
  em_analise: "Pronto p/ análise",
  aguardando: "Aguardando",
};

export function contractStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export function ContractParseStatus({ status }: { status: string }) {
  return <StatusBadge status={contractStatusLabel(status)} />;
}
