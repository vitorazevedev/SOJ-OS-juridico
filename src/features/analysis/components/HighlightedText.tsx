import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { ClauseRisk } from "@/hooks/useContractAnalysis";
import { gravidadeFaixa, GRAVIDADE_HIGHLIGHT, stripMarkdown } from "@/lib/analysisFormat";

// Destaque legado por severity (4 categorias) — mantido só como fallback
// para cláusulas antigas sem gravidade calculada (Fase 6, Parte 5).
export const SEV_HIGHLIGHT: Record<string, string> = {
  critico: "bg-risk-critical/25 border-b-2 border-risk-critical",
  alto:    "bg-risk-high/25 border-b-2 border-risk-high",
  medio:   "bg-risk-medium/25 border-b-2 border-risk-medium",
  baixo:   "bg-risk-low/25 border-b-2 border-risk-low",
};

// Builds a normalized string (all whitespace → single space) and a map
// from each position in the normalized string back to the original string.
function buildNormMap(s: string): { norm: string; normToOrig: number[] } {
  const normToOrig: number[] = [];
  let norm = "";
  let prevSpace = false;
  for (let i = 0; i < s.length; i++) {
    if (/\s/.test(s[i])) {
      if (!prevSpace) { normToOrig.push(i); norm += " "; }
      prevSpace = true;
    } else {
      normToOrig.push(i);
      norm += s[i];
      prevSpace = false;
    }
  }
  return { norm, normToOrig };
}

// Finds needle in text, trying exact → normalized → prefix fallback.
// Returns original-string {start, end} or null.
function findInText(
  text: string,
  needle: string,
  normText: { norm: string; normToOrig: number[] },
): { start: number; end: number } | null {
  // 1. Exact match
  const exact = text.indexOf(needle);
  if (exact >= 0) return { start: exact, end: exact + needle.length };

  // 2. Whitespace-normalized match
  const normNeedle = needle.replace(/\s+/g, " ").trim();
  if (normNeedle.length < 10) return null;
  const ni = normText.norm.indexOf(normNeedle);
  if (ni >= 0) {
    const start = normText.normToOrig[ni];
    const endNi = ni + normNeedle.length - 1;
    const end = normText.normToOrig[Math.min(endNi, normText.normToOrig.length - 1)] + 1;
    return { start, end };
  }

  // 3. Prefix fallback — match the first 120 normalized chars of the needle,
  //    then extend by the full needle length from that position.
  //    Handles cases where AI-generated original_text has minor tail differences.
  const prefixLen = Math.min(120, Math.floor(normNeedle.length * 0.6));
  const prefix = normNeedle.slice(0, prefixLen);
  if (prefix.length < 30) return null;
  const pi = normText.norm.indexOf(prefix);
  if (pi < 0) return null;
  const start = normText.normToOrig[pi];
  // Extend by approximately the original needle length from the found position
  const end = Math.min(start + needle.length + 20, text.length);
  return { start, end };
}

// Localiza o trecho de original_text dentro do texto completo e expande a
// janela até os limites da frase (ponto anterior → ponto seguinte), pra
// mostrar o contexto completo em vez de só o fragmento cru capturado pela IA.
export function findClauseSentence(rawText: string, rawNeedle: string): { before: string; match: string; after: string } | null {
  if (!rawNeedle || rawNeedle.length < 15) return null;
  // Ambos os lados precisam passar pela mesma limpeza de Markdown — senão a
  // sintaxe (##, **, |) que sobrevive só de um lado desalinha as posições.
  const text = stripMarkdown(rawText);
  const needle = stripMarkdown(rawNeedle);
  const normText = buildNormMap(text);
  const m = findInText(text, needle, normText);
  if (!m) return null;

  const BACKWARD_CAP = 1500;
  const FORWARD_CAP = 1500;

  let start = m.start;
  const backLimit = Math.max(0, m.start - BACKWARD_CAP);
  while (start > backLimit && !".!?".includes(text[start - 1])) start--;
  while (start < m.start && /\s/.test(text[start])) start++;

  let end = m.end;
  const fwdLimit = Math.min(text.length, m.end + FORWARD_CAP);
  while (end < fwdLimit && !".!?".includes(text[end - 1])) end++;

  return {
    before: text.slice(start, m.start),
    match: text.slice(m.start, m.end),
    after: text.slice(m.end, end),
  };
}

export function HighlightedText({ text: rawText, clauses }: { text: string; clauses: ClauseRisk[] }) {
  const segments = useMemo(() => {
    type Seg = { text: string; highlight: string | null; title: string | null };
    const text = stripMarkdown(rawText);
    const markers: { start: number; end: number; highlight: string; title: string }[] = [];
    const normText = buildNormMap(text);

    for (const cl of clauses) {
      if (!cl.original_text || cl.original_text.length < 15) continue;
      const needle = stripMarkdown(cl.original_text);
      const match = findInText(text, needle, normText);
      if (match) {
        const highlight = cl.gravidade != null
          ? GRAVIDADE_HIGHLIGHT[gravidadeFaixa(cl.gravidade).zone]
          : (SEV_HIGHLIGHT[cl.severity] ?? "bg-yellow-500/20");
        markers.push({ ...match, highlight, title: cl.title });
      }
    }

    markers.sort((a, b) => a.start - b.start);

    const segs: Seg[] = [];
    let pos = 0;
    for (const m of markers) {
      if (m.end <= pos) continue; // fully inside previous highlight — skip
      const start = Math.max(m.start, pos); // clip start if partially overlapping
      if (start > pos) segs.push({ text: text.slice(pos, start), highlight: null, title: null });
      segs.push({ text: text.slice(start, m.end), highlight: m.highlight, title: m.title });
      pos = m.end;
    }
    if (pos < text.length) segs.push({ text: text.slice(pos), highlight: null, title: null });
    return segs;
  }, [rawText, clauses]);

  return (
    <article className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap font-mono max-h-[60vh] overflow-y-auto scroll-hide text-justify">
      {segments.map((seg, i) =>
        seg.highlight ? (
          <span
            key={i}
            className={cn("rounded-sm", seg.highlight)}
            title={seg.title ?? undefined}
          >
            {seg.text}
          </span>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </article>
  );
}
