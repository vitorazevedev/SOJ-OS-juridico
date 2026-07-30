import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Upload } from "lucide-react";
import { uploadInvoiceForOrg } from "@/hooks/useInvoices";

type Props = {
  org: { id: string; name: string } | null;
  onClose: () => void;
};

const EMPTY = { numeroNota: "", valorBrl: "", dataEmissao: "" };

export function UploadInvoiceModal({ org, onClose }: Props) {
  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const handleClose = () => {
    setForm(EMPTY);
    setFile(null);
    onClose();
  };

  const valid = form.numeroNota.trim() && form.valorBrl.trim() && form.dataEmissao && file;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org || !file) return;
    const valorCents = Math.round(parseFloat(form.valorBrl.replace(/\./g, "").replace(",", ".")) * 100);
    if (isNaN(valorCents) || valorCents <= 0) return;

    setSaving(true);
    const ok = await uploadInvoiceForOrg(org.id, file, form.numeroNota.trim(), valorCents, form.dataEmissao);
    setSaving(false);
    if (ok) handleClose();
  };

  return (
    <Dialog open={!!org} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md w-full">
        <DialogHeader>
          <DialogTitle>Upload de Nota Fiscal</DialogTitle>
        </DialogHeader>
        {org && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
            <p className="text-xs text-muted-foreground -mt-2">
              Organização: <span className="text-foreground font-medium">{org.name}</span>
            </p>

            <div className="space-y-1">
              <Label htmlFor="inv-numero">Número da nota *</Label>
              <Input
                id="inv-numero"
                value={form.numeroNota}
                onChange={(e) => setForm((f) => ({ ...f, numeroNota: e.target.value }))}
                placeholder="Ex: 1234"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="inv-valor">Valor (R$) *</Label>
                <Input
                  id="inv-valor"
                  inputMode="decimal"
                  value={form.valorBrl}
                  onChange={(e) => setForm((f) => ({ ...f, valorBrl: e.target.value }))}
                  placeholder="490,00"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="inv-data">Data de emissão *</Label>
                <Input
                  id="inv-data"
                  type="date"
                  value={form.dataEmissao}
                  onChange={(e) => setForm((f) => ({ ...f, dataEmissao: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="inv-file">Arquivo da nota fiscal *</Label>
              <Input
                id="inv-file"
                type="file"
                accept=".pdf,.xml"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>

            <p className="text-[11px] text-muted-foreground">
              Ao salvar, um email é enviado automaticamente ao administrador da organização
              informando que a nota fiscal está disponível.
            </p>

            <div className="flex gap-3 justify-end pt-1">
              <button
                type="button"
                onClick={handleClose}
                className="h-9 px-4 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancelar
              </button>
              <Button type="submit" disabled={saving || !valid} className="gap-2">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                Enviar nota fiscal
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
