import {
  Document,
  Footer,
  LineRuleType,
  Packer,
  PageNumber,
  Paragraph,
  TextRun,

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

// ── ABNT NBR helpers ──────────────────────────────────────────────────────
// Margens: 3cm esquerda/superior, 2cm direita/inferior (em twips: 1cm = 567)
const ABNT_MARGIN = { top: 1701, right: 1134, bottom: 1134, left: 1701 };
// Fonte 12pt = 24 half-points; espaçamento 1,5 linhas = 360 unidades
const abntBody = (text: string, opts?: { bold?: boolean; center?: boolean }): Paragraph =>
  new Paragraph({
    alignment: opts?.center ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
    spacing: { line: 360, lineRule: LineRuleType.AUTO, before: 0, after: 0 },
    indent: opts?.center ? undefined : { firstLine: 709 }, // 1,25cm
    children: [new TextRun({ text, font: "Arial", size: 24, bold: !!opts?.bold })],
  });

const abntHeading = (text: string, level = 1): Paragraph =>
  new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { line: 360, lineRule: LineRuleType.AUTO, before: 280, after: 140 },
    children: [new TextRun({ text, font: "Arial", size: level === 1 ? 28 : 24, bold: true })],
  });

const abntBlank = (): Paragraph =>
  new Paragraph({ spacing: { line: 360, lineRule: LineRuleType.AUTO }, children: [new TextRun("")] });

export async function generateContractDocxBlob(sections: ContractSections, logo?: LogoData | null): Promise<Blob> {
  const children: Paragraph[] = [];

  // ── Capa ────────────────────────────────────────────────────────────────
  if (logo) {
    const maxW = 80;
    const ratio = logo.height / Math.max(1, logo.width);
    const w = Math.min(maxW, logo.width);
    const h = Math.round(w * ratio);
    children.push(
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ data: logo.bytes, transformation: { width: w, height: h }, type: logo.mime } as ConstructorParameters<typeof ImageRun>[0])] }),
      abntBlank(),
    );
  }

  children.push(
    abntBlank(), abntBlank(),
    abntBody(sections.title, { bold: true, center: true }),
    abntBlank(), abntBlank(),
    abntBody(sections.parties.contratante),
    abntBlank(),
    abntBody(sections.parties.contratado),
    abntBlank(), abntBlank(),
  );

  // ── Cláusulas ────────────────────────────────────────────────────────────
  for (const c of sections.clauses) {
    children.push(abntHeading(c.heading, 2), abntBody(c.body), abntBlank());
  }

  // ── Bloco de assinaturas ─────────────────────────────────────────────────
  children.push(
    abntBlank(), abntBlank(),
    abntBody("Por estarem assim justos e contratados, firmam o presente instrumento em 2 (duas) vias de igual teor.", { center: true }),
    abntBlank(), abntBlank(),
    abntBody("_________________________________", { center: true }),
    abntBody("CONTRATANTE", { center: true }),
    abntBlank(),
    abntBody("_________________________________", { center: true }),
    abntBody("CONTRATADO", { center: true }),
    abntBlank(), abntBlank(),
  );

  // ── Rodapé / avisos ──────────────────────────────────────────────────────
  for (const f of sections.footer) {
    children.push(new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { line: 240, lineRule: LineRuleType.AUTO },
      children: [new TextRun({ text: f, font: "Arial", size: 18, color: "888888" })],
    }));
  }

  const doc = new Document({
    styles: { default: { document: { run: { font: "Arial", size: 24 } } } },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: ABNT_MARGIN } },
      footers: {
        default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 20 })] })] }),
      },
      children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  return new Blob([await blob.arrayBuffer()], { type: DOCX_MIME });
}

export function generateContractPdfBlob(sections: ContractSections, logo?: LogoData | null): Blob {
  // ABNT NBR: margens 3cm (esq/sup) e 2cm (dir/inf), Arial 12pt, espaç. 1,5
  const pdf  = new jsPDF({ unit: "mm", format: "a4" });
  const pw   = pdf.internal.pageSize.getWidth();
  const ph   = pdf.internal.pageSize.getHeight();
  const ml   = 30; // margem esq (3cm)
  const mr   = 20; // margem dir (2cm)
  const mt   = 30; // margem sup (3cm)
  const mb   = 20; // margem inf (2cm)
  const cw   = pw - ml - mr;
  const lh   = 7;  // line-height para 12pt × 1,5
  let y = mt;

  const navy: [number,number,number]  = [10, 22, 40];
  const esm:  [number,number,number]  = [6, 113, 115];
  const gray: [number,number,number]  = [100, 100, 110];

  const check = (need = lh) => { if (y + need > ph - mb) { pdf.addPage(); y = mt; } };

  const block = (text: string, opts?: { bold?: boolean; center?: boolean; size?: number; color?: [number,number,number] }) => {
    const sz = opts?.size ?? 12;
    pdf.setFont("helvetica", opts?.bold ? "bold" : "normal");
    pdf.setFontSize(sz);
    pdf.setTextColor(...(opts?.color ?? navy));
    const lines = pdf.splitTextToSize(text, cw) as string[];
    const lhLocal = sz * 0.53;
    for (const line of lines) {
      check(lhLocal);
      const x = opts?.center ? pw / 2 : ml;
      pdf.text(line, x, y, { align: opts?.center ? "center" : "left" });
      y += lhLocal;
    }
  };

  // ── Logo ─────────────────────────────────────────────────────────────────
  if (logo) {
    const w = Math.min(40, logo.width / 4);
    const h = w * (logo.height / Math.max(1, logo.width));
    try { pdf.addImage(logo.dataUrl, logo.mime.toUpperCase(), (pw - w) / 2, y, w, h); y += h + 10; } catch { /**/ }
  }

  // ── Capa ─────────────────────────────────────────────────────────────────
  y += 20;
  block(sections.title, { bold: true, center: true, size: 14 });
  y += 20;
  block(sections.parties.contratante, { size: 12 });
  y += lh * 0.5;
  block(sections.parties.contratado, { size: 12 });
  y += 20;

  // ── Cláusulas ─────────────────────────────────────────────────────────────
  for (const c of sections.clauses) {
    y += lh;
    block(c.heading, { bold: true, size: 12 });
    y += lh * 0.3;
    block(c.body, { size: 12 });
  }

  // ── Assinaturas ───────────────────────────────────────────────────────────
  y += lh * 3;
  check(30);
  block("Por estarem assim justos e contratados, firmam o presente instrumento em 2 (duas) vias de igual teor.", { center: true, size: 12 });
  y += lh * 3;
  block("________________________________", { center: true });
  block("CONTRATANTE", { center: true });
  y += lh * 2;
  block("________________________________", { center: true });
  block("CONTRATADO", { center: true });

  // ── Avisos ────────────────────────────────────────────────────────────────
  y += lh * 2;
  for (const f of sections.footer) block(f, { size: 9, color: gray });

  // ── Rodapé paginado ───────────────────────────────────────────────────────
  const totalPgs = (pdf as unknown as { internal: { getNumberOfPages(): number } }).internal.getNumberOfPages();
  for (let p = 1; p <= totalPgs; p++) {
    pdf.setPage(p);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(...esm);
    pdf.text("Ponderum · Inteligência Contratual", ml, ph - 10);
    pdf.setTextColor(...gray);
    pdf.text(`Pág. ${p} / ${totalPgs}`, pw - mr, ph - 10, { align: "right" });
    pdf.setDrawColor(...esm); pdf.setLineWidth(0.3);
    pdf.line(ml, ph - 14, pw - mr, ph - 14);
  }

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

// ── Paleta para PDFs de relatório (tema claro — otimizado para impressão) ──
const PC = {
  navy:   [10, 22, 40]      as [number,number,number], // #0A1628
  esm:    [6, 113, 115]     as [number,number,number], // #067173 Esmeralda
  mid:    [138, 155, 176]   as [number,number,number], // #8A9BB0
  light:  [245, 246, 248]   as [number,number,number], // #F5F6F8
  border: [218, 222, 230]   as [number,number,number], // linha divisória
  white:  [255, 255, 255]   as [number,number,number],
};

/** Desenha o cabeçalho padrão Ponderum e retorna o y após o cabeçalho. */
function drawReportHeader(pdf: jsPDF, opts: {
  title: string; subtitle: string; date: string;
  fields: { label: string; value: string }[];
}): { y: number; ml: number; mr: number; cw: number } {
  const pw = pdf.internal.pageSize.getWidth();
  const ml = 25, mr = 20, cw = pw - ml - mr;

  // Faixa de acento (Esmeralda, 3mm)
  pdf.setFillColor(...PC.esm);
  pdf.rect(0, 0, pw, 3, "F");

  // Coluna direita: DATA + PÁGINAS (preenchido no footer depois)
  const rx = pw - mr - 48;
  let y = 12;

  pdf.setFont("helvetica", "normal"); pdf.setFontSize(7); pdf.setTextColor(...PC.mid);
  pdf.text("DOCUMENTO", ml, y);
  pdf.text("DATA", rx, y);
  y += 5;

  pdf.setFont("helvetica", "bold"); pdf.setFontSize(14); pdf.setTextColor(...PC.navy);
  pdf.text(opts.title, ml, y);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(10);
  pdf.text(opts.date, rx, y);
  y += 5;

  pdf.setFont("helvetica", "normal"); pdf.setFontSize(8.5); pdf.setTextColor(...PC.mid);
  pdf.text(opts.subtitle, ml, y);
  y += 10;

  // Faixa de metadados (cinza claro)
  const bandH = 17;
  pdf.setFillColor(...PC.light);
  pdf.rect(0, y, pw, bandH, "F");
  pdf.setDrawColor(...PC.border); pdf.setLineWidth(0.3);
  pdf.line(0, y, pw, y);
  pdf.line(0, y + bandH, pw, y + bandH);

  const colW = cw / Math.max(opts.fields.length, 1);
  opts.fields.forEach((f, i) => {
    const x = ml + i * colW;
    // Separador vertical entre colunas
    if (i > 0) { pdf.setDrawColor(...PC.border); pdf.line(x - 3, y + 2, x - 3, y + bandH - 2); }
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(7); pdf.setTextColor(...PC.mid);
    pdf.text(f.label, x, y + 5);
    pdf.setFont("helvetica", i === 0 ? "bold" : "normal"); pdf.setFontSize(9.5); pdf.setTextColor(...PC.navy);
    const val = (pdf.splitTextToSize(f.value || "—", colW - 6) as string[])[0];
    pdf.text(val, x, y + 11.5);
  });

  return { y: y + bandH + 6, ml, mr, cw };
}

/** Rodapé paginado padrão. Chamado após gerar todas as páginas. */
function drawReportFooters(pdf: jsPDF, label: string) {
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const ml = 25, mr = 20;
  const total = (pdf as unknown as { internal: { getNumberOfPages(): number } }).internal.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    pdf.setPage(p);
    pdf.setDrawColor(...PC.border); pdf.setLineWidth(0.3);
    pdf.line(ml, ph - 14, pw - mr, ph - 14);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); pdf.setTextColor(...PC.mid);
    pdf.text(label, ml, ph - 9);
    pdf.text(`Pág. ${p} / ${total}`, pw - mr, ph - 9, { align: "right" });
    // Preenche o campo PÁGINAS no header apenas na primeira página
    if (p === 1) {
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(7); pdf.setTextColor(...PC.mid);
      pdf.text("PÁGINAS", pw - mr - 48, 18);
      pdf.setFontSize(10); pdf.setTextColor(...PC.navy);
      pdf.text(`${total}`, pw - mr - 48, 23);
    }
  }
}

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
  const ph  = pdf.internal.pageSize.getHeight();

  const score   = analysis.risk_score ?? 0;
  const sevRgb: [number,number,number] = score >= 70 ? [220, 38, 38] : score >= 40 ? [234, 88, 12] : score >= 20 ? [202, 138, 4] : [6, 113, 115];
  const sevLabel = score >= 70 ? "CRÍTICO" : score >= 40 ? "ALTO" : score >= 20 ? "MÉDIO" : "BAIXO";

  // ── Cabeçalho ──────────────────────────────────────────────────────────────
  // Score badge inline no campo da direita
  const scoreTxt = `${score} · ${sevLabel}`;
  const { y: y0, ml, cw } = drawReportHeader(pdf, {
    title:    "Relatório de Análise Contratual",
    subtitle: "Ponderum · Inteligência Contratual",
    date:     fmtDatePdf(analysis.analyzed_at),
    fields: [
      { label: "CONTRATO",    value: contract.name },
      { label: "CONTRAPARTE", value: contract.party ?? "—" },
      { label: "TIPO",        value: contract.type ?? "—" },
      { label: "SCORE",       value: scoreTxt },
    ],
  });
  // Colore o valor de score com a cor do risco
  const scoreX = ml + cw * 0.75;
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(9.5); pdf.setTextColor(...sevRgb);
  pdf.text(scoreTxt, scoreX, y0 - 6 + 17 - 6); // posição alinhada com os outros valores

  let y = y0;
  const check = (need = 8) => { if (y + need > ph - 20) { pdf.addPage(); y = 20; } };

  const writeTxt = (text: string, sz = 10, bold = false, color = PC.navy, maxW = cw) => {
    pdf.setFont("helvetica", bold ? "bold" : "normal"); pdf.setFontSize(sz); pdf.setTextColor(...color);
    const lines = pdf.splitTextToSize(text, maxW) as string[];
    lines.forEach((l) => { check(sz * 0.5); pdf.text(l, ml, y); y += sz * 0.5; });
  };

  const sectionHeader = (title: string) => {
    check(12);
    pdf.setFillColor(...PC.esm); pdf.rect(ml, y, 2, 7, "F");
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(11); pdf.setTextColor(...PC.navy);
    pdf.text(title, ml + 5, y + 5);
    y += 12;
  };

  // ── Resumo executivo ──────────────────────────────────────────────────────
  if (analysis.summary) {
    sectionHeader("Resumo Executivo");
    const summaryLines = pdf.splitTextToSize(analysis.summary, cw - 10) as string[];
    const boxH = summaryLines.length * 4.5 + 8;
    check(boxH);
    pdf.setFillColor(...PC.light);
    pdf.roundedRect(ml, y, cw, boxH, 2, 2, "F");
    pdf.setFontSize(9); pdf.setFont("helvetica", "normal"); pdf.setTextColor(...PC.navy);
    summaryLines.forEach((l, i) => { pdf.text(l, ml + 5, y + 6 + i * 4.5); });
    y += boxH + 6;
  }

  // ── Exposição financeira ──────────────────────────────────────────────────
  if (analysis.financial_total != null) {
    check(18);
    pdf.setFillColor(...PC.light);
    pdf.roundedRect(ml, y, cw, 14, 2, 2, "F");
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(...PC.mid);
    pdf.text("Exposição financeira total estimada:", ml + 5, y + 6);
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(12); pdf.setTextColor(220, 38, 38);
    pdf.text(fmtBRLPdf(analysis.financial_total), ml + 5, y + 12);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(...PC.mid);
    pdf.text(`${clauses.length} cláusula(s) identificada(s)`, ml + 80, y + 12);
    y += 20;
  }

  // ── Cláusulas ────────────────────────────────────────────────────────────
  if (clauses.length > 0) {
    sectionHeader(`Cláusulas Identificadas  (${clauses.length})`);

    clauses.forEach((cl, idx) => {
      const sev = SEV_RGB[cl.severity] ?? ([100, 100, 100] as [number,number,number]);
      const hasExp = cl.exposure_likely != null;
      const titleW = cw - 35 - (hasExp ? 32 : 5);
      const titleLines = (pdf.splitTextToSize(cl.title, titleW) as string[]).slice(0, 2);
      const hdrH = Math.max(10, titleLines.length * 5 + 5);
      const needH = hdrH + 7
        + (cl.original_text ? Math.min((pdf.splitTextToSize(cl.original_text, cw - 14) as string[]).length * 4.5 + 10, 40) : 0)
        + (cl.suggestion    ? Math.min((pdf.splitTextToSize(cl.suggestion,    cw - 14) as string[]).length * 4.5 + 10, 40) : 0);
      check(Math.min(needH, 60));

      // Cabeçalho da cláusula
      pdf.setFillColor(...PC.light);
      pdf.roundedRect(ml, y, cw, hdrH, 2, 2, "F");
      pdf.setFillColor(...sev);
      pdf.rect(ml, y, 3, hdrH, "F");
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(8.5); pdf.setTextColor(...sev);
      pdf.text(`${idx + 1}. ${SEV_LABEL[cl.severity] ?? cl.severity.toUpperCase()}`, ml + 6, y + 6.5);
      pdf.setFont("helvetica", "normal"); pdf.setTextColor(...PC.navy);
      titleLines.forEach((l, i) => pdf.text(l, ml + 34, y + 6.5 + i * 5));
      if (hasExp) {
        pdf.setFont("helvetica", "bold"); pdf.setTextColor(220, 38, 38);
        pdf.text(fmtBRLPdf(cl.exposure_likely), ml + cw - 3, y + 6.5, { align: "right" });
      }
      y += hdrH + 7;

      // Original
      if (cl.original_text) {
        check(10);
        pdf.setFillColor(254, 242, 242); pdf.roundedRect(ml + 3, y, cw - 3, 5, 1, 1, "F");
        pdf.setFont("helvetica", "bold"); pdf.setFontSize(7.5); pdf.setTextColor(180, 30, 30);
        pdf.text("ORIGINAL (RISCO)", ml + 6, y + 3.5);
        y += 6;
        writeTxt(cl.original_text, 8.5, false, [60, 60, 60], cw - 10);
        y += 2;
      }

      // Sugestão
      if (cl.suggestion) {
        check(10);
        pdf.setFillColor(236, 253, 245); pdf.roundedRect(ml + 3, y, cw - 3, 5, 1, 1, "F");
        pdf.setFont("helvetica", "bold"); pdf.setFontSize(7.5); pdf.setTextColor(...PC.esm);
        pdf.text("SUGESTÃO", ml + 6, y + 3.5);
        y += 6;
        writeTxt(cl.suggestion, 8.5, false, [60, 60, 60], cw - 10);
        y += 2;
      }
      y += 4;
    });
  }

  drawReportFooters(pdf, "Ponderum · Relatório de Análise Contratual");
  return new Blob([pdf.output("arraybuffer")], { type: PDF_MIME });
}

export type DataSummaryPdfInput = {
  exported_at: string;
  organization: { name?: string; cnpj?: string | null; sector?: string | null; plan_id?: string; created_at?: string } | null;
  users: { name?: string | null; email?: string; role?: string }[];
  contracts: { name?: string; type?: string | null; status?: string; created_at?: string }[];
  contract_obligations: { description?: string | null; due_date?: string | null; status?: string }[];
  generated_contracts: { name?: string; created_at?: string }[];
};

const STATUS_LABEL_PDF: Record<string, string> = {
  aguardando: "Aguardando",
  em_analise: "Pronto p/ análise",
  analisado: "Analisado",
};

// Resumo legível dos mesmos dados do export JSON (LGPD Art. 18).
export function generateDataSummaryPdf(data: DataSummaryPdfInput): Blob {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const ph  = pdf.internal.pageSize.getHeight();
  const org = data.organization;

  const { y: y0, ml, cw } = drawReportHeader(pdf, {
    title:    "Resumo de Dados Pessoais",
    subtitle: "Ponderum · Portabilidade de dados — LGPD Art. 18",
    date:     fmtDatePdf(data.exported_at),
    fields: [
      { label: "ORGANIZAÇÃO", value: org?.name ?? "—" },
      { label: "PLANO",       value: org?.plan_id ?? "—" },
      { label: "CNPJ",        value: org?.cnpj ?? "—" },
      { label: "CRIADA EM",   value: fmtDatePdf(org?.created_at) },
    ],
  });

  let y = y0;
  const check = (need = 8) => { if (y + need > ph - 20) { pdf.addPage(); y = 20; } };

  const secHeader = (title: string) => {
    check(12);
    pdf.setFillColor(...PC.esm); pdf.rect(ml, y, 2, 7, "F");
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(11); pdf.setTextColor(...PC.navy);
    pdf.text(title, ml + 5, y + 5);
    y += 12;
  };

  const tableRow = (cols: string[], widths: number[], header = false) => {
    check(6);
    if (header) {
      pdf.setFillColor(...PC.light); pdf.rect(ml, y - 3.5, cw, 6, "F");
    }
    pdf.setFont("helvetica", header ? "bold" : "normal");
    pdf.setFontSize(header ? 8 : 9);
    pdf.setTextColor(...(header ? PC.mid : PC.navy));
    let x = ml;
    cols.forEach((c, i) => {
      const v = (pdf.splitTextToSize(c, widths[i] - 2) as string[])[0] ?? "";
      pdf.text(v, x, y);
      x += widths[i];
    });
    pdf.setDrawColor(...PC.border); pdf.setLineWidth(0.2);
    pdf.line(ml, y + 2, ml + cw, y + 2);
    y += header ? 6 : 5.5;
  };

  const fieldRow = (label: string, value: string) => {
    check(6);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(8.5); pdf.setTextColor(...PC.mid);
    pdf.text(label, ml, y);
    pdf.setFont("helvetica", "normal"); pdf.setTextColor(...PC.navy);
    pdf.text(value, ml + 35, y);
    y += 5;
  };

  // ── Organização ─────────────────────────────────────────────────────────
  secHeader("Organização");
  if (org) {
    fieldRow("Nome",      org.name    ?? "—");
    fieldRow("CNPJ",      org.cnpj    ?? "—");
    fieldRow("Setor",     org.sector  ?? "—");
    fieldRow("Plano",     org.plan_id ?? "—");
    fieldRow("Criada em", fmtDatePdf(org.created_at));
  }
  y += 4;

  // ── Usuários ─────────────────────────────────────────────────────────────
  secHeader(`Usuários  (${data.users.length})`);
  const uW = [cw * 0.33, cw * 0.43, cw * 0.24];
  tableRow(["NOME", "E-MAIL", "PAPEL"], uW, true);
  data.users.forEach((u) => tableRow([u.name ?? "—", u.email ?? "—", u.role ?? "—"], uW));
  y += 4;

  // ── Contratos ────────────────────────────────────────────────────────────
  secHeader(`Contratos  (${data.contracts.length})`);
  const cW = [cw * 0.38, cw * 0.24, cw * 0.2, cw * 0.18];
  tableRow(["NOME", "TIPO", "STATUS", "ENVIADO EM"], cW, true);
  data.contracts.forEach((c) =>
    tableRow([c.name ?? "—", c.type ?? "—", STATUS_LABEL_PDF[c.status ?? ""] ?? c.status ?? "—", fmtDatePdf(c.created_at)], cW)
  );
  y += 4;

  // ── Obrigações ───────────────────────────────────────────────────────────
  secHeader(`Obrigações  (${data.contract_obligations.length})`);
  const oW = [cw * 0.55, cw * 0.25, cw * 0.2];
  tableRow(["DESCRIÇÃO", "VENCIMENTO", "STATUS"], oW, true);
  data.contract_obligations.forEach((o) =>
    tableRow([o.description ?? "—", fmtDatePdf(o.due_date), o.status ?? "—"], oW)
  );
  y += 4;

  // ── Contratos gerados ────────────────────────────────────────────────────
  secHeader(`Contratos gerados  (${data.generated_contracts.length})`);
  const gW = [cw * 0.7, cw * 0.3];
  tableRow(["NOME", "GERADO EM"], gW, true);
  data.generated_contracts.forEach((g) => tableRow([g.name ?? "—", fmtDatePdf(g.created_at)], gW));

  drawReportFooters(pdf, "Ponderum · Resumo de dados pessoais (LGPD Art. 18)");
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
