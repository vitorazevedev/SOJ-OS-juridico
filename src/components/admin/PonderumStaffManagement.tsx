import { useEffect, useState } from "react";
import { SojCard } from "@/components/layout/Primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Copy, Check, Pencil } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { formatDocument, validateDocument } from "@/lib/brazilianDocs";

type StaffMember = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  staff_job_title: string | null;
  can_view_dev: boolean;
  can_view_ponderum_team: boolean;
  full_platform_access: boolean;
  created_at: string;
};

const EMPTY_FORM = {
  name: "", jobTitle: "", ddi: "+55", phone: "", email: "", cnpj: "",
  canViewDev: false, canViewPonderumTeam: false, fullPlatformAccess: false,
};
type FieldErrors = Partial<Record<"name" | "jobTitle" | "email" | "cnpj" | "permissions", string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TRANSIENT_ERROR_RE = /invalid jwt|unable to parse or verify signature|unrecognized jwt kid/i;

function maskPhone(v: string, ddi: string): string {
  const d = v.replace(/\D/g, "");
  if (ddi.trim() !== "+55") return d.slice(0, 15).replace(/(\d{3})(?=\d)/g, "$1 ").trim();
  const dd = d.slice(0, 11);
  if (!dd) return "";
  if (dd.length <= 2) return `(${dd}`;
  if (dd.length <= 6) return `(${dd.slice(0, 2)}) ${dd.slice(2)}`;
  if (dd.length <= 10) return `(${dd.slice(0, 2)}) ${dd.slice(2, 6)}-${dd.slice(6)}`;
  return `(${dd.slice(0, 2)}) ${dd.slice(2, 7)}-${dd.slice(7)}`;
}

async function invokeCreateStaff(body: Record<string, unknown>, attempts = 3): Promise<{ data?: { actionLink: string; emailSent: boolean }; error?: string }> {
  let lastMessage = "Erro ao cadastrar membro";
  for (let i = 0; i < attempts; i++) {
    const { data, error } = await supabase.functions.invoke("admin-create-staff-member", { body });
    if (!error && !data?.error) return { data };

    let message = data?.error ?? "Erro ao cadastrar membro";
    let retryableFlag = data?.retryable === true;
    const context = (error as { context?: Response } | undefined)?.context;
    if (!data?.error && context && typeof context.json === "function") {
      try {
        const respBody = await context.json();
        if (respBody?.error) message = respBody.error;
        if (respBody?.retryable === true) retryableFlag = true;
      } catch {
        // corpo não era JSON — mantém a mensagem genérica
      }
    }
    lastMessage = message;

    const isTransient = retryableFlag || TRANSIENT_ERROR_RE.test(message);
    if (!isTransient || i === attempts - 1) return { error: message };
    await new Promise((r) => setTimeout(r, 500 * (i + 1)));
  }
  return { error: lastMessage };
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function PermissionBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <span className={cn(
      "text-[10px] px-2 py-0.5 rounded-full font-medium",
      active ? "bg-primary-dim text-primary" : "bg-muted text-muted-foreground opacity-50"
    )}>
      {label}
    </span>
  );
}

export function PonderumStaffManagement() {
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [sendEmail, setSendEmail] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ actionLink: string; emailSent: boolean } | null>(null);
  const [copied, setCopied] = useState<"link" | "template" | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ jobTitle: "", canViewDev: false, canViewPonderumTeam: false, fullPlatformAccess: false });
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchMembers = async () => {
    setLoadingList(true);
    const { data, error } = await supabase.rpc("list_ponderum_staff");
    if (error) {
      toast.error("Erro ao carregar membros da equipe");
    } else {
      setMembers((data as unknown as StaffMember[]) ?? []);
    }
    setLoadingList(false);
  };

  useEffect(() => { fetchMembers(); }, []);

  const set = <K extends keyof typeof form>(key: K, value: typeof form[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleCnpjChange = (raw: string) => {
    set("cnpj", formatDocument(raw));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: FieldErrors = {};
    if (!form.name.trim()) errs.name = "Informe o nome";
    if (!form.jobTitle.trim()) errs.jobTitle = "Informe a função";
    if (!form.email.trim()) errs.email = "Informe o email";
    else if (!EMAIL_RE.test(form.email.trim())) errs.email = "Email inválido";
    if (form.cnpj.trim()) {
      const doc = validateDocument(form.cnpj);
      if (!doc.valid) errs.cnpj = `${doc.type === "cpf" ? "CPF" : "CNPJ"} inválido`;
    }
    if (!form.canViewDev && !form.canViewPonderumTeam && !form.fullPlatformAccess) {
      errs.permissions = "Selecione ao menos uma permissão";
    }
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      toast.error("Preencha todos os campos corretamente");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await invokeCreateStaff({
        name: form.name.trim(),
        jobTitle: form.jobTitle.trim(),
        ddi: form.ddi.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        cnpj: form.cnpj.trim() || null,
        canViewDev: form.canViewDev,
        canViewPonderumTeam: form.canViewPonderumTeam,
        fullPlatformAccess: form.fullPlatformAccess,
        sendEmail,
      });
      if (error || !data) {
        toast.error(error ?? "Erro ao cadastrar membro");
        return;
      }
      setResult({ actionLink: data.actionLink, emailSent: data.emailSent });
      toast.success("Membro cadastrado com sucesso!");
      setForm(EMPTY_FORM);
      setFieldErrors({});
      fetchMembers();
    } catch {
      toast.error("Erro ao cadastrar membro");
    } finally {
      setLoading(false);
    }
  };

  const whatsappTemplate = (link: string) =>
    `Bem-vindo(a) à equipe Ponderum!\nSua conta foi criada com sucesso.\n\nPara acessar, clique no link abaixo e crie sua senha:\n\n${link}`;

  const copy = async (text: string, which: "link" | "template") => {
    await navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 2000);
  };

  const startEdit = (m: StaffMember) => {
    setEditingId(m.id);
    setEditForm({
      jobTitle: m.staff_job_title ?? "",
      canViewDev: m.can_view_dev,
      canViewPonderumTeam: m.can_view_ponderum_team,
      fullPlatformAccess: m.full_platform_access,
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    if (!editForm.canViewDev && !editForm.canViewPonderumTeam && !editForm.fullPlatformAccess) {
      toast.error("Selecione ao menos uma permissão");
      return;
    }
    setSavingEdit(true);
    try {
      const { error } = await supabase.rpc("staff_update_member_permissions", {
        p_user_id: editingId,
        p_job_title: editForm.jobTitle.trim(),
        p_can_view_dev: editForm.canViewDev,
        p_can_view_ponderum_team: editForm.canViewPonderumTeam,
        p_full_platform_access: editForm.fullPlatformAccess,
      });
      if (error) {
        toast.error("Erro ao salvar permissões");
        return;
      }
      toast.success("Permissões atualizadas");
      setEditingId(null);
      fetchMembers();
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <SojCard className="flex flex-col gap-4 p-5">
      <div>
        <h2 className="text-sm font-medium">Gestão da Equipe Ponderum</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Cadastre membros internos e controle o que cada um pode acessar.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 border-b border-border pb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="sm-name">Nome *</Label>
            <Input id="sm-name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Maria Silva"
              className={cn(fieldErrors.name && "border-destructive/70")}
            />
            {fieldErrors.name && <p className="text-[11px] text-destructive">{fieldErrors.name}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="sm-role">Função *</Label>
            <Input id="sm-role" value={form.jobTitle} onChange={(e) => set("jobTitle", e.target.value)} placeholder="Atendente, Suporte, Comercial..."
              className={cn(fieldErrors.jobTitle && "border-destructive/70")}
            />
            {fieldErrors.jobTitle && <p className="text-[11px] text-destructive">{fieldErrors.jobTitle}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="sm-email">Email *</Label>
            <Input id="sm-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="voce@ponderum.com"
              className={cn(fieldErrors.email && "border-destructive/70")}
            />
            {fieldErrors.email && <p className="text-[11px] text-destructive">{fieldErrors.email}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="sm-phone">WhatsApp / Celular</Label>
            <div className="flex gap-2">
              <Input
                id="sm-ddi" value={form.ddi} aria-label="DDI (código do país)"
                onChange={(e) => {
                  const newDdi = `+${e.target.value.replace(/\D/g, "").slice(0, 4)}`;
                  set("ddi", newDdi);
                  set("phone", maskPhone(form.phone, newDdi));
                }}
                maxLength={5} className="w-16 shrink-0 text-center px-1"
              />
              <Input
                id="sm-phone" type="tel" value={form.phone} placeholder="(11) 99999-9999"
                onChange={(e) => set("phone", maskPhone(e.target.value, form.ddi))}
                maxLength={15} className="flex-1"
              />
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="sm-cnpj">CPF ou CNPJ</Label>
          <Input
            id="sm-cnpj" value={form.cnpj} placeholder="000.000.000-00 ou 00.000.000/0000-00"
            onChange={(e) => handleCnpjChange(e.target.value)} maxLength={18}
            className={cn("md:max-w-xs", fieldErrors.cnpj && "border-destructive/70")}
          />
          {fieldErrors.cnpj && <p className="text-[11px] text-destructive">{fieldErrors.cnpj}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <Label>Permissões *</Label>
          <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm">Menu Dev</span>
              <Switch checked={form.canViewDev} onCheckedChange={(v) => set("canViewDev", v)} />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm">Menu Equipe Ponderum</span>
              <Switch checked={form.canViewPonderumTeam} onCheckedChange={(v) => set("canViewPonderumTeam", v)} />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm">Acesso completo à plataforma (como cliente)</span>
              <Switch checked={form.fullPlatformAccess} onCheckedChange={(v) => set("fullPlatformAccess", v)} />
            </label>
          </div>
          {fieldErrors.permissions && <p className="text-[11px] text-destructive">{fieldErrors.permissions}</p>}
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
          <div>
            <p className="text-sm">Enviar email de onboarding</p>
            <p className="text-xs text-muted-foreground">Envia o link de criação de senha automaticamente por email</p>
          </div>
          <Switch checked={sendEmail} onCheckedChange={setSendEmail} />
        </div>

        <Button type="submit" disabled={loading} className="w-full md:w-auto md:self-start">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Cadastrar membro
        </Button>
      </form>

      {result && (
        <div className="flex flex-col gap-2 rounded-lg border border-primary/30 bg-primary-dim p-4">
          <p className="text-sm font-medium">
            Membro cadastrado{result.emailSent ? " — email de onboarding enviado" : ""}.
          </p>
          <div className="flex flex-col md:flex-row gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => copy(result.actionLink, "link")}>
              {copied === "link" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              Copiar link
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => copy(whatsappTemplate(result.actionLink), "template")}>
              {copied === "template" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              Copiar template WhatsApp
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="pb-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Nome</th>
              <th className="pb-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Função</th>
              <th className="pb-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Permissões</th>
              <th className="pb-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground text-right">Desde</th>
              <th className="pb-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {members.map((m) => (
              <tr key={m.id}>
                <td className="py-2.5">
                  <div>{m.name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{m.email}</div>
                </td>
                <td className="py-2.5 text-muted-foreground text-xs">{m.staff_job_title ?? "—"}</td>
                <td className="py-2.5">
                  <div className="flex flex-wrap gap-1">
                    <PermissionBadge label="Dev" active={m.can_view_dev} />
                    <PermissionBadge label="Equipe Ponderum" active={m.can_view_ponderum_team} />
                    <PermissionBadge label="Plataforma completa" active={m.full_platform_access} />
                  </div>
                </td>
                <td className="py-2.5 text-right text-muted-foreground text-xs">{fmtDate(m.created_at)}</td>
                <td className="py-2.5 text-right">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(m)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
            {!loadingList && members.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-xs text-muted-foreground">
                  Nenhum membro cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editingId && (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <p className="text-sm font-medium">Editar membro</p>
          <div className="space-y-1">
            <Label htmlFor="edit-role">Função</Label>
            <Input id="edit-role" value={editForm.jobTitle} onChange={(e) => setEditForm((p) => ({ ...p, jobTitle: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm">Menu Dev</span>
              <Switch checked={editForm.canViewDev} onCheckedChange={(v) => setEditForm((p) => ({ ...p, canViewDev: v }))} />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm">Menu Equipe Ponderum</span>
              <Switch checked={editForm.canViewPonderumTeam} onCheckedChange={(v) => setEditForm((p) => ({ ...p, canViewPonderumTeam: v }))} />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm">Acesso completo à plataforma (como cliente)</span>
              <Switch checked={editForm.fullPlatformAccess} onCheckedChange={(v) => setEditForm((p) => ({ ...p, fullPlatformAccess: v }))} />
            </label>
          </div>
          <div className="flex gap-2">
            <Button onClick={saveEdit} disabled={savingEdit} size="sm">
              {savingEdit && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Salvar
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>Cancelar</Button>
          </div>
        </div>
      )}
    </SojCard>
  );
}
