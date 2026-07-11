import { useState } from "react";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { renameContract, type DbContract } from "@/hooks/useContracts";

const renameSchema = z.object({
  name: z.string().trim().min(1, "Nome não pode ficar vazio").max(200, "Máximo de 200 caracteres"),
});

export function RenameDialog({
  contract,
  onClose,
  onRenamed,
}: {
  contract: DbContract;
  onClose: () => void;
  onRenamed: () => void;
}) {
  const [name, setName] = useState(contract.name);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (name.trim() === contract.name) { onClose(); return; }
    const result = renameSchema.safeParse({ name });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    setSaving(true);
    try {
      await renameContract(contract.id, result.data.name);
      toast.success("Contrato renomeado");
      onRenamed();
      onClose();
    } catch {
      toast.error("Erro ao renomear contrato");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm flex flex-col gap-4 shadow-xl">
        <h3 className="font-semibold text-base">Renomear contrato</h3>
        <input
          autoFocus
          value={name}
          onChange={(e) => { setName(e.target.value); setError(null); }}
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") onClose(); }}
          className={cn(
            "w-full rounded-[10px] border bg-[rgba(255,255,255,0.05)] text-foreground focus:outline-none transition-colors",
            error ? "border-destructive/70" : "border-[rgba(255,255,255,0.1)] focus:border-[rgba(0,229,160,0.6)]",
          )}
          style={{ padding: "11px 12px", minHeight: 44 }}
        />
        {error && <p className="text-[10px] text-destructive -mt-2">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-lg border border-border text-sm hover:bg-muted/40 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
