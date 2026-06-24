import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

export type SearchResultKind = "contract" | "obligation" | "generated";

export type SearchResult = {
  id: string;
  kind: SearchResultKind;
  title: string;
  subtitle: string;
  href: string;
};

async function runSearch(q: string): Promise<SearchResult[]> {
  const like = `%${q}%`;

  const [contractsRes, obligationsRes, generatedRes] = await Promise.all([
    supabase
      .from("contracts")
      .select("id,name,party,type,status")
      .or(`name.ilike.${like},party.ilike.${like}`)
      .limit(4),
    supabase
      .from("contract_obligations")
      .select("id,description,due_date,contracts(name)")
      .ilike("description", like)
      .limit(4),
    supabase
      .from("generated_contracts")
      .select("id,name,template_id")
      .ilike("name", like)
      .limit(3),
  ]);

  const results: SearchResult[] = [];

  type RawContract = { id: string; name: string; party: string | null; type: string | null; status: string };
  for (const c of (contractsRes.data ?? []) as RawContract[]) {
    results.push({
      id: c.id,
      kind: "contract",
      title: c.name,
      subtitle: [c.party, c.type].filter(Boolean).join(" · ") || c.status,
      href: `/analysis/${c.id}`,
    });
  }

  type RawObligation = { id: string; description: string; due_date: string | null; contracts: { name: string } | null };
  for (const o of (obligationsRes.data ?? []) as RawObligation[]) {
    const dateLabel = o.due_date
      ? new Date(o.due_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
      : null;
    results.push({
      id: o.id,
      kind: "obligation",
      title: o.description,
      subtitle: [o.contracts?.name, dateLabel].filter(Boolean).join(" · ") || "Obrigação",
      href: "/obligations",
    });
  }

  type RawGenerated = { id: string; name: string | null; template_id: string | null };
  for (const g of (generatedRes.data ?? []) as RawGenerated[]) {
    results.push({
      id: g.id,
      kind: "generated",
      title: g.name ?? "Contrato gerado",
      subtitle: g.template_id ?? "Documento gerado",
      href: "/generator",
    });
  }

  return results;
}

export function useGlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const data = await runSearch(q);
        setResults(data);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query]);

  const clear = useCallback(() => { setQuery(""); setResults([]); }, []);

  return { query, setQuery, results, loading, clear };
}
