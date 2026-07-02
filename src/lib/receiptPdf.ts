import { jsPDF } from "jspdf";
import type { LogoData } from "./contractDocs";
import { PDF_MIME } from "./contractDocs";

export type ReceiptData = {
  org: { name: string; cnpj?: string | null };
  billingDate: string;
  description: string;
  amountCents: number;
  status: string;
  invoiceId?: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  pago: "Pago",
  pendente: "Pendente",
  cancelled: "Cancelado",
  cancelado: "Cancelado",
};

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export function generateReceiptPdf(data: ReceiptData, logo?: LogoData | null): Blob {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  let y = margin;

  if (logo) {
    const maxW = 40;
    const ratio = logo.height / Math.max(1, logo.width);
    const w = Math.min(maxW, logo.width / 4);
    const h = w * ratio;
    try { pdf.addImage(logo.dataUrl, logo.mime.toUpperCase(), (pageWidth - w) / 2, y, w, h); y += h + 8; } catch { /* ignore */ }
  }

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text("RECIBO DE PAGAMENTO", pageWidth / 2, y, { align: "center" });
  y += 10;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text(data.org.name, pageWidth / 2, y, { align: "center" });
  y += 6;
  if (data.org.cnpj) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(`CNPJ: ${data.org.cnpj}`, pageWidth / 2, y, { align: "center" });
    y += 6;
  }
  y += 6;

  pdf.setDrawColor(200);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 10;

  const rows: [string, string][] = [
    ["Data", formatDate(data.billingDate)],
    ["Descrição", data.description],
    ["Valor", formatBRL(data.amountCents)],
    ["Status", STATUS_LABEL[data.status?.toLowerCase()] ?? data.status],
  ];
  if (data.invoiceId) rows.push(["ID da Fatura", data.invoiceId]);

  pdf.setFontSize(11);
  for (const [label, value] of rows) {
    pdf.setFont("helvetica", "bold");
    pdf.text(label + ":", margin, y);
    pdf.setFont("helvetica", "normal");
    const valueLines = pdf.splitTextToSize(String(value), pageWidth - margin * 2 - 40) as string[];
    valueLines.forEach((line, idx) => { pdf.text(line, margin + 40, y + idx * 6); });
    y += 6 * Math.max(1, valueLines.length) + 3;
  }

  y += 6;
  pdf.setDrawColor(200);
  pdf.line(margin, y, pageWidth - margin, y);

  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(9);
  pdf.setTextColor(120);
  pdf.text("Ponderum — Inteligência Contratual", pageWidth / 2, pageHeight - margin, { align: "center" });

  return new Blob([pdf.output("arraybuffer")], { type: PDF_MIME });
}
