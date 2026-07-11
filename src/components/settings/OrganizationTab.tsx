import { useMemo, useRef, useState } from "react";
import { z } from "zod";
import { SojCard } from "@/components/layout/Primitives";
import { cn } from "@/lib/utils";
import { Upload, Image as ImageIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useOrganization } from "@/hooks/useOrganization";
import { formatDocument, validateDocument } from "@/lib/brazilianDocs";

const orgSchema = z.object({
  name:   z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(120, "Máximo de 120 caracteres"),
  cnpj:   z.string().optional().refine(
    (v) => !v || validateDocument(v).valid, "CNPJ/CPF inválido"
  ),
  sector: z.string().max(120, "Máximo de 120 caracteres").optional(),
});

type OrgErrors = Partial<Record<"name" | "cnpj" | "sector", string>>;

const inputCls =
  "w-full rounded-[10px] border bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.1)] text-foreground focus:outline-none focus:border-[rgba(0,229,160,0.6)] transition-colors";

export function OrganizationTab() {
  const { org, loading, logoUrl, updateOrg, uploadLogo, removeLogo } = useOrganization();
  const fileRef = useRef<HTMLInputElement>(null);
  const [orgForm, setOrgForm] = useState({ name: "", cnpj: "", sector: "" });
  const [orgErrors, setOrgErrors] = useState<OrgErrors>({});
  const [cnpjError, setCnpjError] = useState("");
  const [savingOrg, setSavingOrg] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useMemo(() => {
    if (org) {
      setOrgForm({ name: org.name, cnpj: org.cnpj ?? "", sector: org.sector ?? "" });
      setCnpjError("");
    }
  }, [org]);

  const handleCnpjChange = (raw: string) => {
    const formatted = formatDocument(raw);
    const { valid, type } = validateDocument(raw);
    setCnpjError(valid ? "" : `${type === "cpf" ? "CPF" : "CNPJ"} inválido`);
    setOrgForm((prev) => ({ ...prev, cnpj: formatted }));
  };

  const handleSaveOrg = async () => {
    const result = orgSchema.safeParse(orgForm);
    if (!result.success) {
      const errs: OrgErrors = {};
      result.error.issues.forEach((i) => { const f = i.path[0] as keyof OrgErrors; if (!errs[f]) errs[f] = i.message; });
      setOrgErrors(errs);
      return;
    }
    setOrgErrors({});
    setSavingOrg(true);
    try {
      await updateOrg({
        name: orgForm.name.trim(),
        cnpj: orgForm.cnpj.trim() || null,
        sector: orgForm.sector.trim() || null,
      });
      toast.success("Organização atualizada com sucesso");
    } catch (e) {
      toast.error("Erro ao salvar", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setSavingOrg(false);
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo muito grande", { description: "Máximo 5MB" });
      return;
    }
    setUploadingLogo(true);
    try {
      await uploadLogo(file);
      toast.success("Logo atualizada com sucesso");
    } catch (err) {
      toast.error("Erro no upload", { description: err instanceof Error ? err.message : undefined });
    } finally {
      setUploadingLogo(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleRemoveLogo = async () => {
    try {
      await removeLogo();
      toast.success("Logo removida");
    } catch (e) {
      toast.error("Erro ao remover logo", { description: e instanceof Error ? e.message : undefined });
    }
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6 mt-4">
      <SojCard className="flex flex-col gap-4">
        <h3 className="font-medium text-sm md:text-base">Logo da Organização</h3>
        <p className="text-xs text-muted-foreground -mt-2">
          Recomendamos PNG sem fundo (transparente) para melhor resultado nos contratos.
        </p>
        <div className="flex flex-col md:flex-row gap-4 md:items-center">
          <div className="h-28 w-28 rounded-xl border border-border bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
            ) : (
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              className="hidden"
              onChange={handleLogoChange}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadingLogo}
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              <Upload className="h-3.5 w-3.5" />
              {uploadingLogo ? "Enviando..." : logoUrl ? "Trocar logo" : "Enviar logo"}
            </button>
            {logoUrl && (
              <button
                onClick={handleRemoveLogo}
                className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg border border-border text-sm hover:bg-muted/40 text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" /> Remover logo
              </button>
            )}
          </div>
        </div>
      </SojCard>

      <SojCard className="flex flex-col gap-3">
        <h3 className="font-medium text-sm md:text-base">Dados da Organização</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Nome da empresa *</label>
            <input
              value={orgForm.name}
              onChange={(e) => { setOrgForm({ ...orgForm, name: e.target.value }); setOrgErrors((p) => ({ ...p, name: undefined })); }}
              className={cn(inputCls, orgErrors.name && "border-destructive/70")}
              style={{ padding: "11px 12px", minHeight: 44 }}
              placeholder="Ex: Ponderum"
            />
            {orgErrors.name && <p className="text-[10px] text-destructive">{orgErrors.name}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">CNPJ</label>
            <input
              value={orgForm.cnpj}
              onChange={(e) => { handleCnpjChange(e.target.value); setOrgErrors((p) => ({ ...p, cnpj: undefined })); }}
              className={cn(inputCls, (cnpjError || orgErrors.cnpj) && "border-destructive/70 focus:border-destructive")}
              style={{ padding: "11px 12px", minHeight: 44 }}
              placeholder="00.000.000/0000-00"
              inputMode="numeric"
            />
            {(cnpjError || orgErrors.cnpj) && <p className="text-[10px] text-destructive">{cnpjError || orgErrors.cnpj}</p>}
          </div>
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-xs text-muted-foreground">Setor</label>
            <input
              value={orgForm.sector}
              onChange={(e) => { setOrgForm({ ...orgForm, sector: e.target.value }); setOrgErrors((p) => ({ ...p, sector: undefined })); }}
              className={cn(inputCls, orgErrors.sector && "border-destructive/70")}
              style={{ padding: "11px 12px", minHeight: 44 }}
              placeholder="Ex: Tecnologia, Saúde, Construção..."
            />
            {orgErrors.sector && <p className="text-[10px] text-destructive">{orgErrors.sector}</p>}
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <button
            onClick={handleSaveOrg}
            disabled={savingOrg || loading}
            className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {savingOrg ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </SojCard>
    </div>
  );
}
