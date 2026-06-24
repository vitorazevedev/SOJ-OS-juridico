import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export type GeneratedContract = {
  id: string;
  org_id: string;
  template_id: string;
  name: string | null;
  party_a: string | null;
  party_b: string | null;
  value_cents: number | null;
  term_days: number | null;
  sector: string | null;
  content_docx: string | null;
  pre_risk_score: number | null;
  file_path: string | null;
  created_at: string;
};

async function getOrgId(): Promise<string | null> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;
  const { data } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", userData.user.id)
    .maybeSingle();
  return data?.org_id ?? null;
}

export function useGeneratedContracts() {
  const [items, setItems] = useState<GeneratedContract[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("generated_contracts")
      .select("*")
      .order("created_at", { ascending: false });
    setItems((data as GeneratedContract[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const ch = supabase
      .channel("generated_contracts_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "generated_contracts" },
        () => fetchAll(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [fetchAll]);

  return { items, loading, refresh: fetchAll };
}

export type GenerateInput = {
  templateId: string;
  name: string;
  partyA: string;
  partyB: string;
  valueCents: number | null;
  termDays: number | null;
  sector: string;
  docxBlob: Blob;
  contentText: string;
  preRiskScore: number;
};

export async function saveGeneratedContract(input: GenerateInput): Promise<{
  id: string;
  filePath: string;
  signedUrl: string | null;
} | null> {
  const orgId = await getOrgId();
  if (!orgId) throw new Error("Organização não encontrada");

  const fileName = `${Date.now()}_${input.templateId}.docx`;
  const filePath = `${orgId}/generated/${fileName}`;

  const { error: upErr } = await supabase.storage
    .from("contracts")
    .upload(filePath, input.docxBlob, {
      upsert: false,
      contentType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
  if (upErr) throw upErr;

  const { data: inserted, error: insErr } = await supabase
    .from("generated_contracts")
    .insert({
      org_id: orgId,
      template_id: input.templateId,
      name: input.name || null,
      party_a: input.partyA || null,
      party_b: input.partyB || null,
      value_cents: input.valueCents,
      term_days: input.termDays,
      sector: input.sector || null,
      content_docx: input.contentText,
      pre_risk_score: input.preRiskScore,
      file_path: filePath,
    })
    .select("id")
    .single();
  if (insErr) throw insErr;

  const { data: signed } = await supabase.storage
    .from("contracts")
    .createSignedUrl(filePath, 60 * 60 * 24 * 7);

  return { id: inserted.id, filePath, signedUrl: signed?.signedUrl ?? null };
}

export async function getSignedUrl(filePath: string): Promise<string | null> {
  const { data } = await supabase.storage
    .from("contracts")
    .createSignedUrl(filePath, 60 * 60 * 24 * 7);
  return data?.signedUrl ?? null;
}

export async function deleteGeneratedContract(id: string, filePath: string | null): Promise<void> {
  if (filePath) {
    await supabase.storage.from("contracts").remove([filePath]);
  }
  const { error } = await supabase.from("generated_contracts").delete().eq("id", id);
  if (error) throw error;
}
