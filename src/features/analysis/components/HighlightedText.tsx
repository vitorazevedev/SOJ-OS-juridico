import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { ClauseRisk } from "@/hooks/useContractAnalysis";

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

export function HighlightedText({ text, clauses }: { text: string; clauses: ClauseRisk[] }) {
  const segments = useMemo(() => {
    type Seg = { text: string; severity: string | null; title: string | null };
    const markers: { start: number; end: number; severity: string; title: string }[] = [];
    const normText = buildNormMap(text);

    for (const cl of clauses) {
      if (!cl.original_text || cl.original_text.length < 15) continue;
      const match = findInText(text, cl.original_text, normText);
      if (match) {
        markers.push({ ...match, severity: cl.severity, title: cl.title });
      }
    }

    markers.sort((a, b) => a.start - b.start);

    const segs: Seg[] = [];
    let pos = 0;
    for (const m of markers) {
      if (m.end <= pos) continue; // fully inside previous highlight — skip
      const start = Math.max(m.start, pos); // clip start if partially overlapping
      if (start > pos) segs.push({ text: text.slice(pos, start), severity: null, title: null });
      segs.push({ text: text.slice(start, m.end), severity: m.severity, title: m.title });
      pos = m.end;
    }
    if (pos < text.length) segs.push({ text: text.slice(pos), severity: null, title: null });
    return segs;
  }, [text, clauses]);

  return (
    <article className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap font-mono max-h-[60vh] overflow-y-auto scroll-hide">
      {segments.map((seg, i) =>
        seg.severity ? (
          <span
            key={i}
            className={cn("rounded-sm", SEV_HIGHLIGHT[seg.severity] ?? "bg-yellow-500/20")}
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
