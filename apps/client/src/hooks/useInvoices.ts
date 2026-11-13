import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export type Invoice = {
  id: string;
  org_id: string;
  numero_nota: string;
  valor_cents: number;
  data_emissao: string;
  file_path: string;
  created_at: string;
};

// Notas fiscais da organizacao do usuario logado (aba Notas Fiscais em
// Configuracoes > Plano). Espelha o padrao de useOrganization pra recibos.
export function useInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("invoices")
      .select("id, org_id, numero_nota, valor_cents, data_emissao, file_path, created_at")
      .order("data_emissao", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar notas fiscais");
    } else {
      setInvoices((data as Invoice[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  return { invoices, loading, refresh: fetchInvoices };
}

export async function downloadInvoiceFile(filePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("contracts")
    .createSignedUrl(filePath, 60);
  if (error) {
    toast.error("Erro ao gerar link de download");
    return null;
  }
  return data.signedUrl;
}

// Usado pelo painel Equipe Ponderum (Upload NF): sobe o arquivo, registra a
// nota fiscal e dispara o email pro admin da organizacao.
export async function uploadInvoiceForOrg(
  orgId: string,
  file: File,
  numeroNota: string,
  valorCents: number,
  dataEmissao: string,
): Promise<boolean> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
  const path = `notas-fiscais/${orgId}/${Date.now()}-${numeroNota.replace(/[^a-zA-Z0-9-]/g, "_")}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from("contracts")
    .upload(path, file, { contentType: file.type || "application/pdf" });
  if (upErr) {
    toast.error("Erro ao enviar o arquivo da nota fiscal");
    return false;
  }

  const { data: invoiceId, error: rpcErr } = await supabase.rpc("staff_create_invoice", {
    p_org_id: orgId,
    p_numero_nota: numeroNota,
    p_valor_cents: valorCents,
    p_data_emissao: dataEmissao,
    p_file_path: path,
  });
  if (rpcErr || !invoiceId) {
    toast.error("Erro ao registrar a nota fiscal");
    return false;
  }

  const { error: fnErr } = await supabase.functions.invoke("admin-send-invoice-email", {
    body: { invoice_id: invoiceId },
  });
  if (fnErr) {
    toast.error("Nota fiscal salva, mas o email não pôde ser enviado");
    return true;
  }

  toast.success("Nota fiscal enviada e email disparado ao cliente");
  return true;
}
