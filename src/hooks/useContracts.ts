import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

// Mirrors PLAN_MONTHLY_LIMIT / FREEMIUM_MONTHLY_LIMIT in supabase/functions/parse-contract/index.ts
const PLAN_MONTHLY_LIMIT: Record<string, number | null> = {
  starter: 10,
  pro: null,
  enterprise: null,
};
const FREEMIUM_MONTHLY_LIMIT = 1;

export type ParsedData = {
  parties: string[];
  signing_date: string | null;
  start_date: string | null;
  end_date: string | null;
  term_description: string | null;
  contract_value_brl: number | null;
  penalty_description: string | null;
  key_clauses: string[];
};

export type DbContract = {
  id: string;
  name: string;
  party: string | null;
  type: string | null;
  status: string;
  file_name: string | null;
  file_path: string | null;
  file_size: number | null;
  file_type: string | null;
  created_at: string;
  risk_score: number | null;
  parsed_data: ParsedData | null;
};

export function useContracts() {
  const [contracts, setContracts] = useState<DbContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const fetchContracts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("contracts")
      .select("id,name,party,type,status,file_name,file_path,file_size,file_type,created_at,parsed_data,contract_analyses(risk_score)")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar contratos");
      console.error(error);
    } else {
      const rows = ((data ?? []) as (Omit<DbContract, "risk_score"> & {
        contract_analyses: { risk_score: number | null }[] | null;
      })[]).map((row) => ({
        ...row,
        risk_score: row.contract_analyses?.[0]?.risk_score ?? null,
        parsed_data: (row.parsed_data as DbContract["parsed_data"]) ?? null,
        contract_analyses: undefined,
      })) as DbContract[];
      setContracts(rows);
      // Clear processingIds for contracts that are no longer 'aguardando'
      setProcessingIds((prev) => {
        if (prev.size === 0) return prev;
        const next = new Set(prev);
        rows.forEach((c) => { if (c.status !== "aguardando") next.delete(c.id); });
        return next;
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  // Realtime: refresh when any contract is updated (e.g. parsing completes)
  useEffect(() => {
    const channel = supabase
      .channel("contracts-realtime")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "contracts" }, () => {
        fetchContracts();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "contracts" }, () => {
        fetchContracts();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchContracts]);

  const markProcessing = useCallback((id: string) => {
    setProcessingIds((prev) => new Set(prev).add(id));
  }, []);

  return { contracts, loading, processingIds, markProcessing, refetch: fetchContracts };
}

export async function deleteContract(id: string, filePath: string | null): Promise<void> {
  if (filePath) {
    await supabase.storage.from("contracts").remove([filePath]);
  }
  const { error } = await supabase.from("contracts").delete().eq("id", id);
  if (error) throw error;
}

export async function renameContract(id: string, name: string): Promise<void> {
  const { error } = await supabase.from("contracts").update({ name: name.trim() }).eq("id", id);
  if (error) throw error;
}

export async function uploadContract(
  file: File,
  onProcessing?: (id: string) => void
): Promise<DbContract | null> {
  const { data: userRow, error: userErr } = await supabase
    .from("users")
    .select("org_id")
    .maybeSingle();

  if (userErr || !userRow?.org_id) {
    toast.error("Não foi possível identificar sua organização");
    return null;
  }

  const orgId = userRow.org_id;

  // Pre-check the monthly plan quota before touching Storage/DB at all, so a
  // blocked upload never leaves a "ghost" contract row stuck in "Aguardando".
  // This mirrors the authoritative check in parse-contract (defense in depth —
  // the backend still enforces it independently of this client-side check).
  const { data: org } = await supabase
    .from("organizations")
    .select("plan_id, plan_status")
    .eq("id", orgId)
    .single();

  const isFreemium = org?.plan_status === "trial";
  const planLimit = isFreemium ? FREEMIUM_MONTHLY_LIMIT : PLAN_MONTHLY_LIMIT[org?.plan_id ?? "starter"] ?? null;
  if (planLimit !== null) {
    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);

    const { count: contractsThisMonth } = await supabase
      .from("contracts")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .gte("created_at", startOfMonth.toISOString());

    if ((contractsThisMonth ?? 0) >= planLimit) {
      toast.error(
        isFreemium
          ? `Limite de ${planLimit} análise gratuita por mês atingido. Faça upgrade para o plano Starter para mais análises.`
          : `Limite de ${planLimit} contratos/mês do plano atingido. Entre em contato com nosso time para aumentar seu limite.`
      );
      return null;
    }
  }

  const ext = file.name.split(".").pop() ?? "bin";
  const safeBase = file.name
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .slice(0, 60);
  const path = `${orgId}/${Date.now()}_${safeBase}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from("contracts")
    .upload(path, file, { contentType: file.type || undefined, upsert: false });

  if (uploadErr) {
    toast.error("Falha ao enviar arquivo");
    console.error(uploadErr);
    return null;
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("contracts")
    .insert({
      org_id: orgId,
      name: file.name.replace(/\.[^.]+$/, ""),
      file_name: file.name,
      file_path: path,
      file_size: file.size,
      file_type: file.type || ext,
      status: "aguardando",
    })
    .select("id,name,party,type,status,file_name,file_path,file_size,file_type,created_at")
    .single();

  if (insertErr) {
    toast.error("Erro ao registrar contrato");
    console.error(insertErr);
    await supabase.storage.from("contracts").remove([path]);
    return null;
  }

  const contract = { ...(inserted as Omit<DbContract, "risk_score" | "parsed_data">), risk_score: null, parsed_data: null } as DbContract;

  toast.success(`${file.name} enviado — processando conteúdo...`);
  onProcessing?.(contract.id);

  // Trigger parsing async — Realtime will update the UI when done
  supabase.functions
    .invoke("parse-contract", { body: { contract_id: contract.id } })
    .then(async ({ error }) => {
      if (!error) return;
      console.error("parse-contract error:", error);
      // FunctionsHttpError.message is a generic "non-2xx status code" string — the
      // actual error (e.g. plan quota exceeded) is in the response body.
      let message = `Erro ao processar "${file.name}". Tente novamente.`;
      const context = (error as { context?: Response }).context;
      if (context && typeof context.json === "function") {
        try {
          const body = await context.json();
          if (body?.error) message = body.error;
        } catch {
          // response body wasn't JSON — keep the generic message
        }
      }
      toast.error(message);
    });

  return contract;
}
