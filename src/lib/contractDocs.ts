import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  ImageRun,
} from "docx";
import { jsPDF } from "jspdf";
import { getTemplateClauses, DISCLAIMER } from "@/lib/contractTemplates";

export type LogoData = {
  bytes: Uint8Array;
  dataUrl: string;
  mime: "png" | "jpeg";
  width: number;
  height: number;
};

export async function fetchLogoData(url: string | null): Promise<LogoData | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const ab = await blob.arrayBuffer();
    const bytes = new Uint8Array(ab);
    const mime: "png" | "jpeg" = blob.type.includes("jpeg") || blob.type.includes("jpg") ? "jpeg" : "png";
    const dataUrl: string = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
    const dims = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ w: 200, h: 80 });
      img.src = dataUrl;
    });
    return { bytes, dataUrl, mime, width: dims.w, height: dims.h };
  } catch {
    return null;
  }
}

export const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export const PDF_MIME = "application/pdf";

export type ContractSections = {
  title: string;
  parties: { contratante: string; contratado: string };
  clauses: { heading: string; body: string }[];
  footer: string[];
};

export function buildContractSections(
  tplTitle: string,
  form: {
    partyA: string; cnpjA?: string; cityA?: string;
    partyB: string; cnpjB?: string; cityB?: string;
    value: string; term: string; sector: string; foro?: string; notes: string;
  },
  tplId?: string,
): ContractSections {
  const clauses = getTemplateClauses(tplId ?? "servicos", form);
  const footer = [
    form.notes ? `Observações: ${form.notes}` : "",
    DISCLAIMER,
  ].filter(Boolean);

  const cnpjA = form.cnpjA?.trim() || "[CNPJ/CPF]";
  const cityA = form.cityA?.trim() || "[cidade/estado]";
  const cnpjB = form.cnpjB?.trim() || "[CNPJ/CPF]";
  const cityB = form.cityB?.trim() || "[cidade/estado]";

  return {
    title: `CONTRATO DE ${tplTitle.toUpperCase()}`,
    parties: {
      contratante: `CONTRATANTE: ${form.partyA || "Empresa XYZ LTDA"}, inscrita no CNPJ/CPF n.º ${cnpjA}, com sede em ${cityA}.`,
      contratado: `CONTRATADO: ${form.partyB || "Fornecedor ABC LTDA"}, inscrita no CNPJ/CPF n.º ${cnpjB}, com sede em ${cityB}.`,
    },
    clauses,
    footer,
  };
}

export async function generateContractDocxBlob(sections: ContractSections, logo?: LogoData | null): Promise<Blob> {
  const children: Paragraph[] = [];

  if (logo) {
    const maxW = 120;
    const ratio = logo.height / Math.max(1, logo.width);
    const w = Math.min(maxW, logo.width);
    const h = Math.round(w * ratio);
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new ImageRun({ data: logo.bytes, transformation: { width: w, height: h }, type: logo.mime } as ConstructorParameters<typeof ImageRun>[0])],
      }),
      new Paragraph({ children: [new TextRun("")] }),
    );
  }

  children.push(
    new Paragraph({ heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, children: [new TextRun({ text: sections.title, bold: true, size: 32 })] }),
    new Paragraph({ children: [new TextRun("")] }),
    new Paragraph({ children: [new TextRun(sections.parties.contratante)] }),
    new Paragraph({ children: [new TextRun(sections.parties.contratado)] }),
    new Paragraph({ children: [new TextRun("")] }),
  );

  for (const c of sections.clauses) {
    children.push(
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: c.heading, bold: true, size: 26 })] }),
      new Paragraph({ children: [new TextRun(c.body)] }),
      new Paragraph({ children: [new TextRun("")] }),
    );
  }
  for (const f of sections.footer) children.push(new Paragraph({ children: [new TextRun(f)] }));

  const doc = new Document({
    styles: { default: { document: { run: { font: "Arial", size: 24 } } } },
    sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } }, children }],
  });

  const blob = await Packer.toBlob(doc);
  return new Blob([await blob.arrayBuffer()], { type: DOCX_MIME });
}

export function generateContractPdfBlob(sections: ContractSections, logo?: LogoData | null): Blob {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (h: number) => { if (y + h > pageHeight - margin) { pdf.addPage(); y = margin; } };
  const writeWrapped = (text: string, opts: { size?: number; bold?: boolean; align?: "left" | "center" } = {}) => {
    const size = opts.size ?? 11;
    pdf.setFont("helvetica", opts.bold ? "bold" : "normal");
    pdf.setFontSize(size);
    const lines = pdf.splitTextToSize(text, maxWidth) as string[];
    const lineHeight = size * 0.45;
    for (const line of lines) {
      ensureSpace(lineHeight);
      pdf.text(line, opts.align === "center" ? pageWidth / 2 : margin, y, { align: opts.align ?? "left" });
      y += lineHeight;
    }
  };

  if (logo) {
    const maxW = 40;
    const ratio = logo.height / Math.max(1, logo.width);
    const w = Math.min(maxW, logo.width / 4);
    const h = w * ratio;
    try { pdf.addImage(logo.dataUrl, logo.mime.toUpperCase(), (pageWidth - w) / 2, y, w, h); y += h + 6; } catch { /* ignore */ }
  }

  writeWrapped(sections.title, { size: 16, bold: true, align: "center" });
  y += 6;
  writeWrapped(sections.parties.contratante);
  writeWrapped(sections.parties.contratado);
  y += 4;

  for (const c of sections.clauses) {
    y += 2;
    writeWrapped(c.heading, { size: 12, bold: true });
    writeWrapped(c.body);
  }

  y += 4;
  for (const f of sections.footer) writeWrapped(f);

  return new Blob([pdf.output("arraybuffer")], { type: PDF_MIME });
}

export function generatePdfFromText(text: string, logo?: LogoData | null): Blob {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  if (logo) {
    const maxW = 40;
    const ratio = logo.height / Math.max(1, logo.width);
    const w = Math.min(maxW, logo.width / 4);
    const h = w * ratio;
    try { pdf.addImage(logo.dataUrl, logo.mime.toUpperCase(), (pageWidth - w) / 2, y, w, h); y += h + 6; } catch { /* ignore */ }
  }

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  const lineHeight = 5;
  for (const p of text.split("\n")) {
    if (!p.trim()) { y += lineHeight / 2; continue; }
    for (const line of pdf.splitTextToSize(p, maxWidth) as string[]) {
      if (y + lineHeight > pageHeight - margin) { pdf.addPage(); y = margin; }
      pdf.text(line, margin, y);
      y += lineHeight;
    }
  }
  return new Blob([pdf.output("arraybuffer")], { type: PDF_MIME });
}

export type AnalysisPdfData = {
  contract: { name: string; party: string | null; type: string | null; created_at: string };
  analysis: { risk_score: number | null; summary: string | null; financial_total: number | null; analyzed_at: string | null };
  clauses: { title: string; severity: string; category: string | null; original_text: string | null; suggestion: string | null; exposure_likely: number | null }[];
};

const SEV_LABEL: Record<string, string> = { critico: "CRÍTICO", alto: "ALTO", medio: "MÉDIO", baixo: "BAIXO" };
const SEV_RGB: Record<string, [number, number, number]> = {
  critico: [220, 38, 38],
  alto: [234, 88, 12],
  medio: [202, 138, 4],
  baixo: [22, 163, 74],
};

function fmtBRLPdf(cents: number | null): string {
  if (cents == null) return "—";
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDatePdf(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export function generateAnalysisPdf(data: AnalysisPdfData): Blob {
  const { contract, analysis, clauses } = data;
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const ml = 20;
  const mr = 20;
  const cw = pageW - ml - mr;
  let y = ml;

  const checkPage = (need = 10) => {
    if (y + need > pageH - mr) { pdf.addPage(); y = ml; }
  };

  const writeLines = (text: string, size = 10, bold = false, color: [number, number, number] = [30, 30, 30]) => {
    pdf.setFontSize(size);
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setTextColor(...color);
    const lines = pdf.splitTextToSize(text, cw) as string[];
    lines.forEach((l) => {
      checkPage(5);
      pdf.text(l, ml, y);
      y += 5;
    });
  };

  // ── Header bar ──────────────────────────────────────────────────────────
  pdf.setFillColor(0, 20, 14);
  pdf.rect(0, 0, pageW, 18, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.setTextColor(0, 229, 160);
  pdf.text("SOJ — Relatório de Análise Jurídica", ml, 12);
  y = 26;

  // ── Contract meta ────────────────────────────────────────────────────────
  writeLines(contract.name, 14, true, [15, 15, 15]);
  y += 1;
  writeLines(
    [contract.party, contract.type, `Analisado em ${fmtDatePdf(analysis.analyzed_at)}`].filter(Boolean).join("  ·  "),
    9, false, [100, 100, 100]
  );
  y += 4;

  // ── Risk score ───────────────────────────────────────────────────────────
  const score = analysis.risk_score ?? 0;
  const scoreColor: [number, number, number] = score >= 70 ? [220, 38, 38] : score >= 40 ? [234, 88, 12] : [22, 163, 74];
  pdf.setFillColor(245, 245, 245);
  pdf.roundedRect(ml, y, cw, 14, 3, 3, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(80, 80, 80);
  pdf.text("Score de Risco", ml + 5, y + 6);
  pdf.setFontSize(18);
  pdf.setTextColor(...scoreColor);
  pdf.text(`${score}`, ml + 5, y + 12);
  pdf.setFontSize(10);
  pdf.setTextColor(80, 80, 80);
  pdf.text(`${clauses.length} cláusulas identificadas`, ml + 22, y + 12);
  if (analysis.financial_total != null) {
    const ftLabel = "Exposição total:";
    const ftValue = fmtBRLPdf(analysis.financial_total);
    pdf.text(ftLabel, ml + 100, y + 6);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(220, 38, 38);
    pdf.text(ftValue, ml + 100, y + 12);
  }
  y += 20;

  // ── Summary ──────────────────────────────────────────────────────────────
  if (analysis.summary) {
    writeLines("Resumo Executivo", 11, true, [15, 15, 15]);
    y += 1;
    pdf.setFillColor(248, 248, 248);
    const summaryLines = pdf.splitTextToSize(analysis.summary, cw - 10) as string[];
    const boxH = summaryLines.length * 5 + 8;
    checkPage(boxH);
    pdf.roundedRect(ml, y, cw, boxH, 2, 2, "F");
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(50, 50, 50);
    summaryLines.forEach((l, i) => { pdf.text(l, ml + 5, y + 6 + i * 5); });
    y += boxH + 6;
  }

  // ── Clauses ──────────────────────────────────────────────────────────────
  writeLines("Cláusulas de Risco", 11, true, [15, 15, 15]);
  y += 2;

  clauses.forEach((cl, idx) => {
    const sevRgb = SEV_RGB[cl.severity] ?? [100, 100, 100];
    const hasExposure = cl.exposure_likely != null;
    // Reserve space on the right for the exposure badge so long titles wrap
    // instead of running underneath/over it.
    const titleMaxWidth = cw - 35 - (hasExposure ? 32 : 5);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    const titleLines = (pdf.splitTextToSize(cl.title, titleMaxWidth) as string[]).slice(0, 2);
    const headerH = Math.max(10, titleLines.length * 5 + 5);

    const needH = headerH + 3 + (cl.original_text ? Math.ceil(cl.original_text.length / 80) * 5 + 8 : 0)
                     + (cl.suggestion ? Math.ceil(cl.suggestion.length / 80) * 5 + 8 : 0);
    checkPage(Math.min(needH, 60));

    // Clause header
    pdf.setFillColor(245, 245, 245);
    pdf.roundedRect(ml, y, cw, headerH, 2, 2, "F");
    pdf.setFillColor(...sevRgb);
    pdf.roundedRect(ml, y, 2, headerH, 1, 1, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(...sevRgb);
    pdf.text(`${idx + 1}. [${SEV_LABEL[cl.severity] ?? cl.severity}]`, ml + 5, y + 6.5);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(20, 20, 20);
    titleLines.forEach((line, i) => { pdf.text(line, ml + 35, y + 6.5 + i * 5); });
    if (hasExposure) {
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(220, 38, 38);
      pdf.text(fmtBRLPdf(cl.exposure_likely), ml + cw - 5, y + 6.5, { align: "right" });
    }
    y += headerH + 3;

    if (cl.original_text) {
      checkPage(10);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(180, 30, 30);
      pdf.text("Original (Risco):", ml + 4, y);
      y += 4;
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(60, 60, 60);
      const origLines = pdf.splitTextToSize(cl.original_text, cw - 10) as string[];
      origLines.forEach((l) => { checkPage(5); pdf.text(l, ml + 4, y); y += 4.5; });
      y += 2;
    }

    if (cl.suggestion) {
      checkPage(10);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(0, 140, 100);
      pdf.text("Sugestão:", ml + 4, y);
      y += 4;
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(60, 60, 60);
      const sugLines = pdf.splitTextToSize(cl.suggestion, cw - 10) as string[];
      sugLines.forEach((l) => { checkPage(5); pdf.text(l, ml + 4, y); y += 4.5; });
      y += 2;
    }

    y += 4;
  });

  // ── Footer ───────────────────────────────────────────────────────────────
  const totalPages = (pdf as unknown as { internal: { getNumberOfPages(): number } }).internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(160, 160, 160);
    pdf.text(
      `SOJ — Sistema Operacional Jurídico  ·  Gerado em ${fmtDatePdf(new Date().toISOString())}  ·  Pág. ${p}/${totalPages}`,
      ml, pageH - 8
    );
  }

  return new Blob([pdf.output("arraybuffer")], { type: PDF_MIME });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
