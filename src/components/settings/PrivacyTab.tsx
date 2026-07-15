import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SojCard } from "@/components/layout/Primitives";
import { Download, FileDown, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { exportOrgDataJson, fetchOrgExportData } from "@/lib/dataExport";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/components/AuthProvider";
import { useOrganization } from "@/hooks/useOrganization";

export function PrivacyTab() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { org } = useOrganization();
  const [exporting, setExporting] = useState(false);
  const [exportingSummary, setExportingSummary] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  const handleExportData = async () => {
    setExporting(true);
    try {
      const { downloadBlob } = await import("@/lib/contractDocs");
      const blob = await exportOrgDataJson();
      const dateStr = new Date().toISOString().slice(0, 10);
      downloadBlob(blob, `soj-dados-${dateStr}.json`);
      toast.success("Dados exportados", { description: "O download deve começar automaticamente." });
    } catch (e) {
      toast.error("Erro ao exportar dados", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setExporting(false);
    }
  };

  const handleExportSummaryPdf = async () => {
    setExportingSummary(true);
    try {
      const { downloadBlob, generateDataSummaryPdf } = await import("@/lib/contractDocs");
      const data = await fetchOrgExportData();
      const blob = generateDataSummaryPdf(data);
      const dateStr = new Date().toISOString().slice(0, 10);
      downloadBlob(blob, `soj-resumo-dados-${dateStr}.pdf`);
      toast.success("Resumo exportado", { description: "O download deve começar automaticamente." });
    } catch (e) {
      toast.error("Erro ao exportar resumo", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setExportingSummary(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      const { error } = await supabase.functions.invoke("delete-account", { body: {} });
      if (error) throw error;
      toast.success("Conta excluída", { description: "Todos os dados da organização foram removidos." });
      await signOut();
      navigate("/login", { replace: true });
    } catch (e) {
      toast.error("Erro ao excluir conta", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setDeletingAccount(false);
      setDeleteOpen(false);
      setDeleteConfirmText("");
    }
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6 mt-4">
      <SojCard className="flex flex-col gap-3">
        <h3 className="font-medium text-sm md:text-base">Exportar meus dados</h3>
        <p className="text-xs text-muted-foreground">
          O JSON é a exportação oficial para fins de portabilidade (LGPD Art. 18) — formato
          estruturado, pensado para outro sistema importar. O PDF é um resumo legível dos mesmos
          dados, caso você só queira ver o que temos sobre você.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExportData}
            disabled={exporting}
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            {exporting ? "Exportando..." : "Exportar dados (JSON)"}
          </button>
          <button
            onClick={handleExportSummaryPdf}
            disabled={exportingSummary}
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg border border-border text-sm font-medium hover:bg-muted/40 disabled:opacity-50"
          >
            <FileDown className="h-3.5 w-3.5" />
            {exportingSummary ? "Gerando..." : "Exportar dados (PDF)"}
          </button>
        </div>
      </SojCard>

      <SojCard className="flex flex-col gap-3 border-destructive/30">
        <h3 className="font-medium text-sm md:text-base text-destructive">Excluir conta e todos os dados</h3>
        <p className="text-xs text-muted-foreground">
          Remove permanentemente sua organização e tudo associado a ela: contratos, análises,
          obrigações, contratos gerados e arquivos no Storage. Essa ação não pode ser desfeita.
        </p>
        <div>
          <button
            onClick={() => setDeleteOpen(true)}
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg border border-destructive text-destructive text-sm font-medium hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" /> Excluir minha conta
          </button>
        </div>
      </SojCard>

      <Dialog open={deleteOpen} onOpenChange={(o) => { setDeleteOpen(o); if (!o) setDeleteConfirmText(""); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" /> Excluir conta permanentemente
            </DialogTitle>
            <DialogDescription>
              Isso vai remover <strong>{org?.name ?? "sua organização"}</strong> e todos os contratos,
              análises, obrigações e arquivos associados. Essa ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5 py-2">
            <Label className="text-xs text-muted-foreground">
              Digite <strong>EXCLUIR</strong> para confirmar
            </Label>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="EXCLUIR"
            />
          </div>
          <DialogFooter>
            <button onClick={() => setDeleteOpen(false)} className="h-10 px-5 rounded-lg border border-border text-sm hover:bg-muted/40">
              Cancelar
            </button>
            <button
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText !== "EXCLUIR" || deletingAccount}
              className="h-10 px-5 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2"
            >
              <Trash2 className="h-3.5 w-3.5" /> {deletingAccount ? "Excluindo..." : "Excluir permanentemente"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
