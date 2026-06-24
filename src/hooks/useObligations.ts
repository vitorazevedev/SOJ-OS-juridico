import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export type DbObligation = {
  id: string;
  contract_id: string;
  description: string;
  responsible: string | null;
  due_date: string | null;
  value_cents: number | null;
  penalty_text: string | null;
  status: string;
  obligation_type: string | null;
  recurrence: string | null;
  created_at: string;
  contract?: { id: string; name: string } | null;
};

export type NewObligationData = {
  contract_id: string;
  description: string;
  responsible: string | null;
  due_date: string | null;
  value_cents: number | null;
  penalty_text: string | null;
  obligation_type: string;
  recurrence: string | null;
};

const SELECT_FIELDS =
  "id,contract_id,description,responsible,due_date,value_cents,penalty_text,status,obligation_type,recurrence,created_at,contract:contracts(id,name)";

async function markOverdueInDB() {
  const today = new Date().toISOString().split("T")[0];
  await supabase
    .from("contract_obligations")
    .update({ status: "atrasada" })
    .eq("status", "pendente")
    .lt("due_date", today);
}

export function useObligations() {
  const [obligations, setObligations] = useState<DbObligation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    await markOverdueInDB();
    const { data, error } = await supabase
      .from("contract_obligations")
      .select(SELECT_FIELDS)
      .order("due_date", { ascending: true, nullsFirst: false });
    if (error) {
      console.error(error);
      toast.error("Erro ao carregar obrigações");
    } else {
      setObligations((data ?? []) as unknown as DbObligation[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel("obligations-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "contract_obligations" }, fetchAll)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchAll]);

  return { obligations, loading, refetch: fetchAll };
}

export async function updateObligationStatus(id: string, status: "pendente" | "cumprida" | "atrasada") {
  const { error } = await supabase
    .from("contract_obligations")
    .update({ status })
    .eq("id", id);
  if (error) {
    toast.error("Erro ao atualizar obrigação");
    return false;
  }
  toast.success(
    status === "cumprida" ? "Obrigação cumprida" : status === "atrasada" ? "Marcada como atrasada" : "Status atualizado"
  );
  return true;
}

export async function createObligation(data: NewObligationData): Promise<boolean> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) { toast.error("Usuário não autenticado"); return false; }
  const { data: profile } = await supabase.from("users").select("org_id").eq("id", u.user.id).maybeSingle();
  if (!profile?.org_id) { toast.error("Organização não encontrada"); return false; }

  const { error } = await supabase.from("contract_obligations").insert({
    ...data,
    org_id: profile.org_id,
    status: "pendente",
  });
  if (error) {
    toast.error("Erro ao criar obrigação");
    return false;
  }
  toast.success("Obrigação criada");
  return true;
}

export async function deleteObligation(id: string): Promise<boolean> {
  const { error } = await supabase.from("contract_obligations").delete().eq("id", id);
  if (error) {
    toast.error("Erro ao excluir obrigação");
    return false;
  }
  toast.success("Obrigação excluída");
  return true;
}
