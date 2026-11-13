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
