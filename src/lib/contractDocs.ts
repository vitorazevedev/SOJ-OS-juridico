import { jsPDF } from "jspdf";
import { resolvedIndex, gravidadeFaixa, POLARIDADE_CALIBRADA, stripMarkdown } from "@/lib/analysisFormat";

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
  analysis: { risk_score: number | null; indice_desequilibrio: number | null; parte_representada: string | null; summary: string | null; financial_total: number | null; analyzed_at: string | null };
  clauses: {
    title: string; severity: string; category: string | null; original_text: string | null;
    suggestion: string | null; exposure_likely: number | null;
    gravidade: number | null;
    ancoras: { gravidade_referencia: number | null; titulo: string | null } | null;
    polaridade_parte_representada: number | null;
    score_simetria: number | null; score_valor_exposto: number | null;
    score_prazo_reversibilidade: number | null; score_foro_execucao: number | null;
    conclusao: string | null; impacto_identificado: string[] | null; mitigacao: string | null;
    finding_type?: "anchored" | "qualitative_unmapped" | "no_finding";
    gating_reason?: string | null;
  }[];
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
  logo?: LogoData | null;
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

  // Logo Ponderum abaixo do subtítulo "Ponderum · Inteligência Contratual",
  // em escala reduzida — cabe no vão até a faixa de metadados (y+10) sem
  // cobrir o texto acima nem ultrapassar a linha do cabeçalho.
  if (opts.logo) {
    const h = 3.2;
    const ratio = opts.logo.width / Math.max(1, opts.logo.height);
    const w = h * ratio;
    try { pdf.addImage(opts.logo.dataUrl, opts.logo.mime.toUpperCase(), ml, y + 2, w, h); } catch { /* ignore */ }
  }

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
    // Preenche PÁGINAS no header da p.1 abaixo do valor de DATA (que fica em y≈17)
    if (p === 1) {
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(7); pdf.setTextColor(...PC.mid);
      pdf.text("PÁGINAS", pw - mr - 48, 24);
      pdf.setFontSize(10); pdf.setTextColor(...PC.navy);
      pdf.text(`${total}`, pw - mr - 48, 29);
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
// Mesmo azul do token --info do design system, pra achado qualitativo (sem
// âncora aprovada pelo gating) não ser confundido com um "BAIXO" real.
const INFO_RGB: [number, number, number] = [71, 158, 245];

function fmtBRLPdf(cents: number | null): string {
  if (cents == null) return "—";
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDatePdf(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

// Validação de saída do relatório (seção 22 do hotfix de calibração) — o PDF
// não pode ser liberado ao cliente com rótulos internos, placeholders
// quebrados ou caracteres de encoding corrompido. Roda sobre o texto dinâmico
// que efetivamente entra no documento, logo antes de fechar o Blob.
const FORBIDDEN_REPORT_TERMS = [
  "Pré-calibração", "Pré calibração", "Pós-calibração",
  "[%Í]", "[%I]", "%Í", "[Í]", "�",
  "{{", "}}", "${", "<%",
  "undefined", "NaN", "R$ NaN",
];

function validateReportOutput(text: string): string[] {
  return FORBIDDEN_REPORT_TERMS.filter((term) => text.includes(term));
}

export async function generateAnalysisPdf(data: AnalysisPdfData): Promise<Blob> {
  const { contract, analysis, clauses } = data;
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const ph  = pdf.internal.pageSize.getHeight();

  const ponderumLogo = await fetchLogoData("/ponderum-logo-dark.png");

  const { value: resolvedScore, legacy: isLegacyIndex } = resolvedIndex(analysis);
  const score   = resolvedScore ?? 0;
  const scoreZona = gravidadeFaixa(score).zone;
  const sevRgb = SEV_RGB[scoreZona];
  const sevLabel = SEV_LABEL[scoreZona];

  // ── Cabeçalho ──────────────────────────────────────────────────────────────
  // Score badge inline no campo da direita
  const scoreTxt = `${score} · ${sevLabel}`;
  const { y: y0, ml, cw } = drawReportHeader(pdf, {
    title:    "Relatório de Análise Contratual",
    subtitle: "Ponderum · Inteligência Contratual",
    date:     fmtDatePdf(analysis.analyzed_at),
    logo:     ponderumLogo,
    fields: [
      { label: "CONTRATO",    value: contract.name },
      { label: "CONTRAPARTE", value: contract.party ?? "—" },
      { label: "TIPO",        value: contract.type ?? "—" },
      { label: "ÍNDICE",      value: scoreTxt },
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
    const lineH = sz * 0.5;
    check(lines.length * lineH);
    // Alinhado à esquerda, linha a linha — align:"justify" do jsPDF estica o
    // espaçamento de forma desproporcional em linhas curtas (texto "explodido"
    // no PDF final), então evitamos a opção nativa de justificar.
    lines.forEach((line, i) => pdf.text(line, ml, y + i * lineH));
    y += lines.length * lineH;
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
    summaryLines.forEach((line, i) => pdf.text(line, ml + 5, y + 6 + i * 4.5));
    y += boxH + 6;
  }

  // ── Exposição financeira ──────────────────────────────────────────────────
  if (analysis.financial_total != null) {
    check(18);
    pdf.setFillColor(...PC.light);
    pdf.roundedRect(ml, y, cw, 14, 2, 2, "F");
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(...PC.mid);
    pdf.text("Exposição financeira total estimada:", ml + 5, y + 6);
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(12);
    if (analysis.financial_total) {
      pdf.setTextColor(220, 38, 38);
      pdf.text(fmtBRLPdf(analysis.financial_total), ml + 5, y + 12);
    } else {
      pdf.setTextColor(...PC.mid);
      pdf.text("Não quantificável", ml + 5, y + 12);
    }
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(...PC.mid);
    pdf.text(`${clauses.length} cláusula(s) identificada(s)`, ml + 80, y + 12);
    y += 20;
  }

  // ── Cláusulas ────────────────────────────────────────────────────────────
  if (clauses.length > 0) {
    sectionHeader(`Cláusulas Identificadas  (${clauses.length})`);

    clauses.forEach((cl, idx) => {
      // original_text vem em Markdown (parse-contract extrai assim pra economizar
      // tokens) — remove a sintaxe antes de exibir no PDF, que é um documento final.
      const originalText = cl.original_text ? stripMarkdown(cl.original_text) : null;
      const isQualitative = cl.finding_type === "qualitative_unmapped";
      const zona = !isQualitative && cl.gravidade != null ? gravidadeFaixa(cl.gravidade) : null;
      const zonaRgb: [number, number, number] = isQualitative ? INFO_RGB : zona ? SEV_RGB[zona.zone] : (SEV_RGB[cl.severity] ?? [100, 100, 100]);
      // "ALERTA" (não "ALERTA QUALITATIVO") pra caber na mesma largura fixa
      // reservada pros outros selos (CRÍTICO/ALTO/MÉDIO/BAIXO) sem sobrepor o título.
      const zonaLabel = isQualitative ? "ALERTA" : zona ? SEV_LABEL[zona.zone] : (SEV_LABEL[cl.severity] ?? cl.severity.toUpperCase());
      const sev = zonaRgb;
      const hasExp = cl.exposure_likely != null && cl.exposure_likely > 0;
      const titleW = cw - 35 - (hasExp ? 32 : 5);
      const titleLines = (pdf.splitTextToSize(cl.title, titleW) as string[]).slice(0, 2);
      const hdrH = Math.max(10, titleLines.length * 5 + 5);
      const needH = hdrH + 7
        + (originalText  ? Math.min((pdf.splitTextToSize(originalText, cw - 14) as string[]).length * 4.5 + 10, 40) : 0)
        + (cl.suggestion ? Math.min((pdf.splitTextToSize(cl.suggestion, cw - 14) as string[]).length * 4.5 + 10, 40) : 0);
      check(Math.min(needH, 60));

      // Cabeçalho da cláusula
      pdf.setFillColor(...PC.light);
      pdf.roundedRect(ml, y, cw, hdrH, 2, 2, "F");
      pdf.setFillColor(...sev);
      pdf.rect(ml, y, 3, hdrH, "F");
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(8.5); pdf.setTextColor(...sev);
      pdf.text(`${idx + 1}. ${zonaLabel}`, ml + 6, y + 6.5);
      pdf.setFont("helvetica", "normal"); pdf.setTextColor(...PC.navy);
      titleLines.forEach((l, i) => pdf.text(l, ml + 34, y + 6.5 + i * 5));
      if (hasExp) {
        pdf.setFont("helvetica", "bold"); pdf.setTextColor(220, 38, 38);
        pdf.text(fmtBRLPdf(cl.exposure_likely), ml + cw - 3, y + 6.5, { align: "right" });
      }
      y += hdrH + 7;

      if (isQualitative) {
        // Achado sem âncora quantitativa aprovada pelo gating — não mostra
        // índice/distribuição (não são reais pra esse tipo de achado);
        // mostra o motivo em vez disso, mesmo tratamento da tela.
        if (cl.gating_reason) {
          check(8);
          pdf.setFont("helvetica", "italic"); pdf.setFontSize(8); pdf.setTextColor(...INFO_RGB);
          writeTxt(`Por que não entra no índice: ${cl.gating_reason}`, 8, false, INFO_RGB, cw - 10);
          y += 2;
        }
      } else {
        // Índice / seu padrão / desvio — "seu padrão" e "desvio" dependem da
        // calibração de polaridade (DEC-047, ver POLARIDADE_CALIBRADA); enquanto
        // não aprovados pelo Fellipe, mostra só o índice da cláusula.
        if (cl.gravidade != null) {
          check(6);
          pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); pdf.setTextColor(...PC.mid);
          const txt = POLARIDADE_CALIBRADA && cl.ancoras?.gravidade_referencia != null
            ? (() => {
                const desvio = cl.gravidade! - cl.ancoras!.gravidade_referencia!;
                return `Índice: ${cl.gravidade!.toFixed(0)}  ·  Seu padrão: ${cl.ancoras!.gravidade_referencia!.toFixed(0)}  ·  Desvio: ${desvio >= 0 ? "+" : ""}${desvio.toFixed(0)}`;
              })()
            : `Índice: ${cl.gravidade.toFixed(0)}`;
          pdf.text(txt, ml + 6, y);
          y += 5;
        }

        // Polaridade
        if (cl.polaridade_parte_representada != null) {
          check(6);
          const voce = cl.polaridade_parte_representada;
          const contraparte = 100 - voce;
          pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); pdf.setTextColor(...PC.navy);
          const txt = `Distribuição estimada do impacto: ${voce.toFixed(0)}% para você e ${contraparte.toFixed(0)}% para a contraparte.`;
          pdf.text(txt, ml + 6, y);
          y += 5;
        }
      }

      // Conclusão
      if (cl.conclusao) {
        check(8);
        writeTxt(cl.conclusao, 8.5, true, PC.navy, cw - 10);
        y += 2;
      }

      // Original
      if (originalText) {
        check(14);
        // Faixa de rótulo (7mm) + corpo separado por gap abaixo
        pdf.setFillColor(254, 242, 242);
        pdf.roundedRect(ml, y, cw, 7, 2, 2, "F");
        pdf.setFillColor(220, 38, 38); pdf.rect(ml, y, 3, 7, "F");
        pdf.setFont("helvetica", "bold"); pdf.setFontSize(7.5); pdf.setTextColor(180, 30, 30);
        pdf.text("ORIGINAL (RISCO)", ml + 6, y + 4.5);
        y += 12; // 7mm faixa + 5mm de respiro antes do texto
        writeTxt(originalText, 8.5, false, [60, 60, 60], cw - 10);
        y += 4;
      }

      // Impacto identificado
      if (cl.impacto_identificado && cl.impacto_identificado.length > 0) {
        check(8);
        pdf.setFont("helvetica", "bold"); pdf.setFontSize(7.5); pdf.setTextColor(...PC.mid);
        pdf.text("IMPACTO IDENTIFICADO", ml + 6, y);
        y += 4.5;
        cl.impacto_identificado.forEach((item) => {
          writeTxt(`•  ${item}`, 8.5, false, [60, 60, 60], cw - 12);
        });
        y += 2;
      }

      // Mitigação
      if (cl.mitigacao) {
        check(8);
        pdf.setFont("helvetica", "bold"); pdf.setFontSize(7.5); pdf.setTextColor(...PC.mid);
        pdf.text("POSSÍVEL MITIGAÇÃO", ml + 6, y);
        y += 4.5;
        writeTxt(cl.mitigacao, 8.5, false, [60, 60, 60], cw - 10);
        y += 2;
      }

      // Sugestão
      if (cl.suggestion) {
        check(14);
        pdf.setFillColor(236, 253, 245);
        pdf.roundedRect(ml, y, cw, 7, 2, 2, "F");
        pdf.setFillColor(...PC.esm); pdf.rect(ml, y, 3, 7, "F");
        pdf.setFont("helvetica", "bold"); pdf.setFontSize(7.5); pdf.setTextColor(...PC.esm);
        pdf.text("SUGESTÃO", ml + 6, y + 4.5);
        y += 12;
        writeTxt(cl.suggestion, 8.5, false, [60, 60, 60], cw - 10);
        y += 4;
      }
      y += 4;
    });
  }

  // ── Aviso legal ────────────────────────────────────────────────────────────
  check(20);
  pdf.setFillColor(...PC.light);
  const avisoLegal =
    "AVISO LEGAL: Esta análise foi gerada pela Ponderum com base em inteligência artificial, a partir do " +
    "texto do contrato analisado. Recomendamos revisão por advogado habilitado antes da assinatura. A " +
    "Ponderum não se responsabiliza por decisões tomadas com base neste documento sem orientação jurídica " +
    "profissional. Conforme Cláusula 8 dos Termos de Uso e Privacidade.";
  const avisoLines = pdf.splitTextToSize(avisoLegal, cw - 10) as string[];
  const avisoBoxH = avisoLines.length * 3.8 + 8;
  check(avisoBoxH);
  pdf.roundedRect(ml, y, cw, avisoBoxH, 2, 2, "F");
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(7); pdf.setTextColor(...PC.mid);
  avisoLines.forEach((line, i) => pdf.text(line, ml + 5, y + 5 + i * 3.8));
  y += avisoBoxH + 6;

  drawReportFooters(
    pdf,
    isLegacyIndex
      ? "Ponderum · Relatório de Análise Contratual · cálculo legado"
      : "Ponderum · Relatório de Análise Contratual",
  );

  const dynamicText = [
    analysis.summary,
    ...clauses.flatMap((cl) => [cl.title, cl.conclusao, cl.mitigacao, cl.suggestion, cl.gating_reason]),
  ].filter((s): s is string => !!s).join("\n");
  const violations = validateReportOutput(dynamicText);
  if (violations.length > 0) {
    throw new Error(`Relatório bloqueado: termos não permitidos encontrados (${violations.join(", ")}). Gere a análise novamente.`);
  }

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

export type ReceiptPdfData = {
  id: string;
  amount_cents: number;
  description: string;
  issued_at: string;
  org_name: string;
  org_cnpj: string | null;
};

// Pessoa jurídica que recebe o pagamento — Ponderum é a marca, GVF é a
// empresa por trás. Mesmo par usado no rodapé da landing page.
const RECEIVER_NAME = "GVF Serviços de Tecnologia Ltda";
const RECEIVER_CNPJ = "68.051.706/0001-16";

export async function generateReceiptPdf(data: ReceiptPdfData): Promise<Blob> {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const ponderumLogo = await fetchLogoData("/ponderum-logo-dark.png");

  const issuedDate = new Date(data.issued_at);
  const dateLabel = issuedDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  const dateTimeLabel = issuedDate.toLocaleString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  const { y, ml, cw } = drawReportHeader(pdf, {
    title: "Recibo de Pagamento",
    subtitle: "Ponderum · Inteligência contratual",
    date: dateLabel,
    logo: ponderumLogo,
    fields: [
      { label: "ORGANIZAÇÃO", value: data.org_name },
      { label: "CNPJ/CPF", value: data.org_cnpj ?? "—" },
      { label: "VALOR PAGO", value: fmtBRLPdf(data.amount_cents) },
    ],
  });

  let cy = y + 4;
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(11); pdf.setTextColor(...PC.navy);
  pdf.text(data.description, ml, cy);
  cy += 10;

  const rows: [string, string][] = [
    ["Recibo Nº", data.id.slice(0, 8).toUpperCase()],
    ["Data e hora do pagamento", dateTimeLabel],
    ["Pagador", data.org_name],
    ["CNPJ/CPF do pagador", data.org_cnpj ?? "—"],
    ["Recebedor", RECEIVER_NAME],
    ["CNPJ do recebedor", RECEIVER_CNPJ],
    ["Valor pago", fmtBRLPdf(data.amount_cents)],
  ];
  rows.forEach(([label, value]) => {
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); pdf.setTextColor(...PC.mid);
    pdf.text(label.toUpperCase(), ml, cy);
    cy += 5;
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(10.5); pdf.setTextColor(...PC.navy);
    pdf.text(value, ml, cy);
    cy += 8;
  });

  cy += 4;
  pdf.setDrawColor(...PC.border); pdf.setLineWidth(0.3);
  pdf.line(ml, cy, ml + cw, cy);
  cy += 6;

  pdf.setFont("helvetica", "normal"); pdf.setFontSize(8.5); pdf.setTextColor(...PC.mid);
  const note = pdf.splitTextToSize(
    "Este recibo confirma o pagamento referente à assinatura da plataforma Ponderum, processado manualmente pela equipe comercial (sem gateway de pagamento automatizado no momento da emissão).",
    cw
  ) as string[];
  pdf.text(note, ml, cy);

  drawReportFooters(pdf, "Ponderum · Recibo de pagamento");
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
