import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SojCard } from "@/components/layout/Primitives";
import { cn } from "@/lib/utils";
import {
  Check,
  Upload,
  Image as ImageIcon,
  Trash2,
  UserPlus,
  Mail,
  Shield,
  X,
  Receipt,
  FileDown,
  Inbox,
  Download,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useBillingHistory, type BillingRecord } from "@/hooks/useBillingHistory";
import { fetchLogoData, downloadBlob } from "@/lib/contractDocs";
import { exportOrgDataJson } from "@/lib/dataExport";
import { supabase } from "@/lib/supabase";
import { generateReceiptPdf } from "@/lib/receiptPdf";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/features/auth/components/AuthProvider";
import { useOrganization, useOrgUsers, type OrgUser } from "@/hooks/useOrganization";
import { ProfileTab } from "@/components/settings/ProfileTab";
import { NotificationsTab } from "@/components/settings/NotificationsTab";
import { formatDocument, validateDocument } from "@/lib/brazilianDocs";

const PLAN_INFO: Record<string, { name: string; color: string; price: string; feats: string[] }> = {
  starter: {
    name: "Starter",
    color: "#3a8dff",
    price: "R$ 147/mês",
    feats: ["5 contratos/mês", "Análise jurídica IA", "Score de risco", "Export PDF"],
  },
  pro: {
    name: "Pro",
    color: "#00e5a0",
    price: "R$ 397/mês",
    feats: [
      "Contratos ilimitados",
      "Impacto financeiro",
      "Word com Redlines",
      "Alertas de vencimento",
      "Gerador de contratos",
    ],
  },
  enterprise: {
    name: "Enterprise",
    color: "#f5a623",
    price: "Sob consulta",
    feats: ["Tudo do Pro", "Multi-tenancy", "SSO + LDAP", "SLA garantido"],
  },
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Membro",
};

const inputCls =
  "w-full rounded-[10px] border bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.1)] text-foreground focus:outline-none focus:border-[rgba(0,229,160,0.6)] transition-colors";

export default function Settings() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { org, loading, logoUrl, updateOrg, uploadLogo, removeLogo } = useOrganization();
  const { users, updateRole, removeUser } = useOrgUsers();
  const fileRef = useRef<HTMLInputElement>(null);
  const [orgForm, setOrgForm] = useState({ name: "", cnpj: "", sector: "" });
  const [cnpjError, setCnpjError] = useState("");
  const [savingOrg, setSavingOrg] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<OrgUser | null>(null);
  const [inviteForm, setInviteForm] = useState({ email: "", role: "member" });
  const [exporting, setExporting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

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

  const myUser = users.find((u) => u.id === user?.id);
  const myRole = myUser?.role ?? "member";
  const canManage = myRole === "owner" || myRole === "admin";

  const { records: billing, loading: billingLoading } = useBillingHistory();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const trialDaysLeft = useMemo(() => {
    if (!org?.trial_ends_at) return null;
    const ms = new Date(org.trial_ends_at).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  }, [org]);
  const trialPct = trialDaysLeft != null ? Math.max(0, Math.min(100, (trialDaysLeft / 7) * 100)) : 0;

  const handleSaveOrg = async () => {
    if (!orgForm.name.trim()) {
      toast({ title: "Nome da empresa é obrigatório", variant: "destructive" });
      return;
    }
    setSavingOrg(true);
    try {
      await updateOrg({
        name: orgForm.name.trim(),
        cnpj: orgForm.cnpj.trim() || null,
        sector: orgForm.sector.trim() || null,
      });
      toast({ title: "Organização atualizada com sucesso" });
    } catch (e) {
      toast({ title: "Erro ao salvar", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    } finally {
      setSavingOrg(false);
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 5MB", variant: "destructive" });
      return;
    }
    setUploadingLogo(true);
    try {
      await uploadLogo(file);
      toast({ title: "Logo atualizada com sucesso" });
    } catch (err) {
      toast({ title: "Erro no upload", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    } finally {
      setUploadingLogo(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleRemoveLogo = async () => {
    try {
      await removeLogo();
      toast({ title: "Logo removida" });
    } catch (e) {
      toast({ title: "Erro ao remover logo", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    }
  };

  const handleRoleChange = async (u: OrgUser, role: string) => {
    try {
      await updateRole(u.id, role);
      toast({ title: `Papel atualizado para ${ROLE_LABELS[role] ?? role}` });
    } catch (e) {
      toast({ title: "Erro ao alterar papel", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    }
  };

  const handleConfirmRemove = async () => {
    if (!removeTarget) return;
    try {
      await removeUser(removeTarget.id);
      toast({ title: "Usuário removido da organização" });
      setRemoveTarget(null);
    } catch (e) {
      toast({ title: "Erro ao remover", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    }
  };

  const handleSendInvite = () => {
    if (!inviteForm.email.trim()) {
      toast({ title: "Informe o email do convidado", variant: "destructive" });
      return;
    }
    toast({
      title: "Convite registrado",
      description: `Compartilhe o link de cadastro com ${inviteForm.email}. O envio automático por email será habilitado em breve.`,
    });
    setInviteForm({ email: "", role: "member" });
    setInviteOpen(false);
  };

  const handleDownloadReceipt = async (rec: BillingRecord) => {
    if (!org) return;
    setDownloadingId(rec.id);
    try {
      const logo = await fetchLogoData(logoUrl);
      const blob = generateReceiptPdf(
        {
          org: { name: org.name, cnpj: org.cnpj },
          billingDate: rec.billing_date,
          description: rec.description,
          amountCents: rec.amount_cents,
          status: rec.status,
          invoiceId: rec.stripe_invoice_id,
        },
        logo,
      );
      const safeDate = rec.billing_date.replace(/[^0-9]/g, "");
      downloadBlob(blob, `recibo-${safeDate}-${rec.id.slice(0, 8)}.pdf`);
    } catch (e) {
      toast({ title: "Erro ao gerar recibo", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      const blob = await exportOrgDataJson();
      const dateStr = new Date().toISOString().slice(0, 10);
      downloadBlob(blob, `soj-dados-${dateStr}.json`);
      toast({ title: "Dados exportados", description: "O download deve começar automaticamente." });
    } catch (e) {
      toast({ title: "Erro ao exportar dados", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      const { error } = await supabase.functions.invoke("delete-account", { body: {} });
      if (error) throw error;
      toast({ title: "Conta excluída", description: "Todos os dados da organização foram removidos." });
      await signOut();
      navigate("/login", { replace: true });
    } catch (e) {
      toast({ title: "Erro ao excluir conta", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    } finally {
      setDeletingAccount(false);
      setDeleteOpen(false);
      setDeleteConfirmText("");
    }
  };

  const planInfo = PLAN_INFO[org?.plan_id ?? "starter"] ?? PLAN_INFO.starter;
  const isTrial = org?.plan_status === "trial";

  return (
    <div className="flex flex-col gap-4 md:gap-6 max-w-[1200px] mx-auto animate-fade-in">
      <div>
        <h1 className="text-lg md:text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="hidden md:block text-sm text-muted-foreground mt-1">
          Gerencie sua organização, usuários e plano
        </p>
      </div>

      <Tabs defaultValue="organization" className="w-full">
        <TabsList className="w-full md:w-auto justify-start flex-wrap">
          <TabsTrigger value="organization">Organização</TabsTrigger>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="plan">Plano</TabsTrigger>
          <TabsTrigger value="profile">Meu Perfil</TabsTrigger>
          <TabsTrigger value="notifications">Notificações</TabsTrigger>
          <TabsTrigger value="privacy">Privacidade e Dados</TabsTrigger>
        </TabsList>

        <TabsContent value="organization" className="flex flex-col gap-4 md:gap-6 mt-4">
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
                  onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                  className={inputCls}
                  style={{ padding: "11px 12px", minHeight: 44 }}
                  placeholder="Ex: Trivia Growth"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground">CNPJ</label>
                <input
                  value={orgForm.cnpj}
                  onChange={(e) => handleCnpjChange(e.target.value)}
                  className={cn(inputCls, cnpjError && "border-destructive/70 focus:border-destructive")}
                  style={{ padding: "11px 12px", minHeight: 44 }}
                  placeholder="00.000.000/0000-00"
                  inputMode="numeric"
                />
                {cnpjError && <p className="text-[10px] text-destructive">{cnpjError}</p>}
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs text-muted-foreground">Setor</label>
                <input
                  value={orgForm.sector}
                  onChange={(e) => setOrgForm({ ...orgForm, sector: e.target.value })}
                  className={inputCls}
                  style={{ padding: "11px 12px", minHeight: 44 }}
                  placeholder="Ex: Tecnologia, Saúde, Construção..."
                />
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
        </TabsContent>

        <TabsContent value="users" className="flex flex-col gap-4 mt-4">
          <SojCard className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="font-medium text-sm md:text-base">Usuários da Organização</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{users.length} no total</p>
              </div>
              {canManage && (
                <button
                  onClick={() => setInviteOpen(true)}
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
                >
                  <UserPlus className="h-3.5 w-3.5" /> Convidar usuário
                </button>
              )}
            </div>

            <div className="flex flex-col divide-y divide-border">
              {users.map((u) => {
                const isMe = u.id === user?.id;
                const isOwner = u.role === "owner";
                const canEditThis = canManage && !isOwner;
                return (
                  <div key={u.id} className="flex items-center gap-3 py-3">
                    <div className="h-9 w-9 rounded-full bg-primary-dim text-primary flex items-center justify-center font-semibold text-xs shrink-0">
                      {(u.name || u.email)[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {u.name || u.email}
                        {isMe && <span className="text-xs text-muted-foreground ml-2">(você)</span>}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {canEditThis ? (
                        <Select
                          value={u.role}
                          onValueChange={(v) => handleRoleChange(u, v)}
                        >
                          <SelectTrigger className="h-9 w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="member">Membro</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-xs px-2.5 py-1 rounded-md bg-muted text-foreground/80 inline-flex items-center gap-1.5">
                          <Shield className="h-3 w-3" />
                          {ROLE_LABELS[u.role] ?? u.role}
                        </span>
                      )}
                      {canEditThis && (
                        <button
                          onClick={() => setRemoveTarget(u)}
                          className="h-9 w-9 rounded-md border border-border flex items-center justify-center text-destructive hover:bg-muted/40"
                          aria-label="Remover usuário"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {users.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Nenhum usuário encontrado.
                </p>
              )}
            </div>
          </SojCard>
        </TabsContent>

        <TabsContent value="plan" className="flex flex-col gap-4 mt-4">
          <SojCard className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h3 className="font-medium text-sm md:text-base">Plano Atual</h3>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xl font-bold" style={{ color: planInfo.color }}>
                    {planInfo.name}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full",
                      isTrial
                        ? "bg-risk-medium-dim text-risk-medium"
                        : org?.plan_status === "active"
                        ? "bg-primary-dim text-primary"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {org?.plan_status ?? "—"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{planInfo.price}</p>
              </div>
              <button
                onClick={() => setUpgradeOpen(true)}
                className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
              >
                Fazer upgrade
              </button>
            </div>

            {isTrial && trialDaysLeft != null && (
              <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Período de teste em andamento</span>
                  <span className="text-xs font-semibold tabular-nums">
                    {trialDaysLeft} {trialDaysLeft === 1 ? "dia restante" : "dias restantes"}
                  </span>
                </div>
                <Progress value={trialPct} />
              </div>
            )}

            <ul className="flex flex-col gap-1.5 mt-2">
              {planInfo.feats.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs">
                  <Check className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: planInfo.color }} />
                  <span className="text-foreground/90">{f}</span>
                </li>
              ))}
            </ul>

            {org?.created_at && (
              <p className="text-xs text-muted-foreground pt-3 border-t border-border">
                Organização criada em{" "}
                {new Date(org.created_at).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            )}
          </SojCard>

          <SojCard className="flex flex-col gap-4">
            <div>
              <h3 className="font-medium text-sm md:text-base">Histórico de Faturamento</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Faturas e recibos da sua organização</p>
            </div>

            {billingLoading ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Carregando…</p>
            ) : billing.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                <div className="h-12 w-12 rounded-full bg-muted/40 flex items-center justify-center">
                  <Inbox className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">Nenhuma fatura ainda</p>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Quando houver pagamentos processados, eles aparecerão aqui com a opção de baixar o recibo em PDF.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Recibo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billing.map((rec) => {
                      const status = (rec.status || "").toLowerCase();
                      const statusVariant: "default" | "secondary" | "destructive" =
                        status === "pago" ? "default" : status === "pendente" ? "secondary" : "destructive";
                      const statusLabel =
                        status === "pago" ? "Pago" :
                        status === "pendente" ? "Pendente" :
                        status === "cancelled" || status === "cancelado" ? "Cancelado" : rec.status;
                      return (
                        <TableRow key={rec.id}>
                          <TableCell className="whitespace-nowrap text-xs md:text-sm">
                            {new Date(rec.billing_date).toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell className="text-xs md:text-sm">{rec.description}</TableCell>
                          <TableCell className="text-right tabular-nums text-xs md:text-sm">
                            {(rec.amount_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusVariant}>{statusLabel}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <button
                              onClick={() => handleDownloadReceipt(rec)}
                              disabled={downloadingId === rec.id}
                              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border text-xs hover:bg-muted/40 disabled:opacity-50"
                            >
                              {downloadingId === rec.id ? (
                                <FileDown className="h-3.5 w-3.5 animate-pulse" />
                              ) : (
                                <Receipt className="h-3.5 w-3.5" />
                              )}
                              Recibo
                            </button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </SojCard>
        </TabsContent>

        <TabsContent value="profile">
          <ProfileTab />
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationsTab />
        </TabsContent>

        <TabsContent value="privacy" className="flex flex-col gap-4 md:gap-6 mt-4">
          <SojCard className="flex flex-col gap-3">
            <h3 className="font-medium text-sm md:text-base">Exportar meus dados</h3>
            <p className="text-xs text-muted-foreground">
              Baixe um arquivo JSON com todos os contratos, análises e obrigações da sua organização
              (direito de portabilidade — LGPD Art. 18).
            </p>
            <div>
              <button
                onClick={handleExportData}
                disabled={exporting}
                className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" />
                {exporting ? "Exportando..." : "Exportar dados (JSON)"}
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
        </TabsContent>
      </Tabs>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Convidar usuário</DialogTitle>
            <DialogDescription>
              O usuário receberá acesso à sua organização ao se cadastrar com o email informado.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                placeholder="convidado@empresa.com"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Papel</Label>
              <Select
                value={inviteForm.role}
                onValueChange={(v) => setInviteForm({ ...inviteForm, role: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Membro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setInviteOpen(false)} className="h-10 px-5 rounded-lg border border-border text-sm hover:bg-muted/40">
              Cancelar
            </button>
            <button onClick={handleSendInvite} className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 inline-flex items-center gap-2">
              <Mail className="h-3.5 w-3.5" /> Enviar convite
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Fazer upgrade</DialogTitle>
            <DialogDescription>
              Entre em contato com nossa equipe para fazer upgrade:{" "}
              <a href="mailto:contato@soj.com.br" className="text-primary font-medium">
                contato@soj.com.br
              </a>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button onClick={() => setUpgradeOpen(false)} className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
              Entendi
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!removeTarget} onOpenChange={(o) => !o && setRemoveTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remover usuário</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover{" "}
              <strong>{removeTarget?.name || removeTarget?.email}</strong> da organização?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button onClick={() => setRemoveTarget(null)} className="h-10 px-5 rounded-lg border border-border text-sm hover:bg-muted/40">
              Cancelar
            </button>
            <button onClick={handleConfirmRemove} className="h-10 px-5 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 inline-flex items-center gap-2">
              <X className="h-3.5 w-3.5" /> Remover
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
