import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

// Usado pelo painel Equipe Ponderum (Upload NF): sobe o arquivo, registra a
// nota fiscal e dispara o email pro admin da organização.
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
