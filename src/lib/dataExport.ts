import { supabase } from "@/lib/supabase";

// LGPD Art. 18 — direito de portabilidade. RLS já restringe cada query à organização do
// usuário autenticado, então não há necessidade de filtrar por org_id explicitamente aqui.
export async function exportOrgDataJson(): Promise<Blob> {
  const [organizations, users, contracts, contents, analyses, clauses, obligations, generated] =
    await Promise.all([
      supabase.from("organizations").select("*"),
      supabase.from("users").select("id,name,email,role,created_at"),
      supabase.from("contracts").select("*"),
      supabase.from("contract_contents").select("*"),
      supabase.from("contract_analyses").select("*"),
      supabase.from("clause_risks").select("*"),
      supabase.from("contract_obligations").select("*"),
      supabase.from("generated_contracts").select("*"),
    ]);

  const payload = {
    exported_at: new Date().toISOString(),
    organization: organizations.data?.[0] ?? null,
    users: users.data ?? [],
    contracts: contracts.data ?? [],
    contract_contents: contents.data ?? [],
    contract_analyses: analyses.data ?? [],
    clause_risks: clauses.data ?? [],
    contract_obligations: obligations.data ?? [],
    generated_contracts: generated.data ?? [],
  };

  return new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
}
