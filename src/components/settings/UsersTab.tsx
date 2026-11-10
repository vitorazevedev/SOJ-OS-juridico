import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { SojCard } from "@/components/layout/Primitives";
import { UserPlus, Shield, Trash2, Mail, X, Pencil, Copy } from "lucide-react";
import { toast } from "sonner";
import { getEdgeFunctionErrorMessage } from "@/lib/edgeFunctionError";
import { PAID_PLANS, FREEMIUM_MAX_USERS, STARTER_MAX_USERS } from "@/lib/pricing";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/components/AuthProvider";
import { useOrgUsers, useOrganization, type OrgUser } from "@/hooks/useOrganization";

const inviteSchema = z.object({
  email: z.string().email("Email inválido"),
});

type InviteErrors = Partial<Record<"email", string>>;

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Membro",
};

type PendingInvite = { id: string; email: string; role: string; created_at: string; token: string };

// Mirrors billing_plans.features.max_users e supabase/functions/
// org-invite-user/index.ts -- fonte unica em src/lib/pricing.ts pro que
// pode rodar no frontend (Edge Function roda em runtime separado).
const MAX_USERS: Record<string, number> = {
  starter: STARTER_MAX_USERS,
  individual: PAID_PLANS.individual.maxUsers,
  escritorio: PAID_PLANS.escritorio.maxUsers,
  juridico: PAID_PLANS.juridico.maxUsers,
  corporativo: PAID_PLANS.corporativo.maxUsers,
};

export function UsersTab() {
  const { user } = useAuth();
  const { org, loading: orgLoading } = useOrganization();
  const { users, updateRole, removeUser, refresh } = useOrgUsers();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<OrgUser | null>(null);
  const [inviteForm, setInviteForm] = useState({ email: "", role: "member" });
  const [inviteErrors, setInviteErrors] = useState<InviteErrors>({});
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", socialName: "", phone: "" });
  const [savingEdit, setSavingEdit] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);

  const myUser = users.find((u) => u.id === user?.id);
  const myRole = myUser?.role ?? "member";
  const canManage = myRole === "owner" || myRole === "admin";

  const fetchPendingInvites = async () => {
    if (!org?.id) return;
    const { data } = await supabase
      .from("org_invites")
      .select("id, email, role, created_at, token")
      .eq("organization_id", org.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    setPendingInvites((data as PendingInvite[]) ?? []);
  };

  useEffect(() => {
    fetchPendingInvites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org?.id]);

  // Limite real de usuarios do plano (1/3/5/10) -- conta tambem convites
  // pendentes, pra nao deixar convidar alem do que o plano permite mesmo
  // antes do aceite.
  const isTrial = org?.plan_status === "trial";
  const isSuspended = org?.plan_status === "suspended";
  const effectiveMaxUsers = (isTrial || isSuspended) ? FREEMIUM_MAX_USERS : (MAX_USERS[org?.plan_id ?? "starter"] ?? 1);
  const reachedFreeUserLimit = users.length + pendingInvites.length >= effectiveMaxUsers;

  const navigate = useNavigate();
  const handleUpgradeForMoreUsers = () => navigate("/settings?tab=plan");

  const handleRoleChange = async (u: OrgUser, role: string) => {
    try {
      await updateRole(u.id, role);
      toast.success(`Papel atualizado para ${ROLE_LABELS[role] ?? role}`);
    } catch (e) {
      toast.error("Erro ao alterar papel", { description: e instanceof Error ? e.message : undefined });
    }
  };

  const openEditSelf = () => {
    if (!myUser) return;
    setEditForm({
      name: myUser.name ?? "",
      socialName: myUser.social_name ?? "",
      phone: myUser.phone ?? "",
    });
    setEditOpen(true);
  };

  // Nome e telefone o próprio usuário pode ajustar aqui; email e o
  // CPF/CNPJ da organização (usados como chave identificadora e pra NF)
  // só mudam com o suporte da Ponderum.
  const handleSaveSelf = async () => {
    if (!user || !editForm.name.trim()) {
      toast.error("Informe o nome");
      return;
    }
    setSavingEdit(true);
    try {
      const { error: authErr } = await supabase.auth.updateUser({ data: { name: editForm.name.trim() } });
      if (authErr) throw authErr;
      const { error } = await supabase
        .from("users")
        .update({
          name: editForm.name.trim(),
          social_name: editForm.socialName.trim() || null,
          phone: editForm.phone.trim() || null,
        })
        .eq("id", user.id);
      if (error) throw error;
      toast.success("Dados atualizados");
      setEditOpen(false);
      await refresh();
    } catch (e) {
      toast.error("Erro ao salvar", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConfirmRemove = async () => {
    if (!removeTarget) return;
    try {
      await removeUser(removeTarget.id);
      toast.success("Usuário removido da organização");
      setRemoveTarget(null);
    } catch (e) {
      toast.error("Erro ao remover", { description: e instanceof Error ? e.message : undefined });
    }
  };

  const handleSendInvite = async () => {
    const result = inviteSchema.safeParse(inviteForm);
    if (!result.success) {
      setInviteErrors({ email: result.error.issues[0]?.message });
      return;
    }
    setInviteErrors({});
    setInviteSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("org-invite-user", {
        body: { action: "create", email: inviteForm.email, role: inviteForm.role },
      });
      if (error || data?.error) {
        const message = data?.error ?? (error ? await getEdgeFunctionErrorMessage(error, "Erro ao criar convite.") : "Erro ao criar convite.");
        toast.error(message);
        return;
      }
      try {
        await navigator.clipboard.writeText(data.invite_url);
        toast.success("Convite enviado!", { description: `E-mail disparado para ${inviteForm.email} (link também copiado, caso precise compartilhar manualmente). Válido por 14 dias.` });
      } catch {
        toast.success("Convite enviado!", { description: `E-mail disparado para ${inviteForm.email}. Link: ${data.invite_url}` });
      }
      setInviteForm({ email: "", role: "member" });
      setInviteOpen(false);
      await fetchPendingInvites();
    } finally {
      setInviteSubmitting(false);
    }
  };

  const handleRevokeInvite = async (invite: PendingInvite) => {
    try {
      const { data, error } = await supabase.functions.invoke("org-invite-user", {
        body: { action: "revoke", invite_id: invite.id },
      });
      if (error || data?.error) {
        const message = data?.error ?? (error ? await getEdgeFunctionErrorMessage(error, "Erro ao cancelar convite.") : "Erro ao cancelar convite.");
        toast.error(message);
        return;
      }
      toast.success("Convite cancelado");
      await fetchPendingInvites();
    } catch (e) {
      toast.error("Erro ao cancelar convite", { description: e instanceof Error ? e.message : undefined });
    }
  };

  return (
    <div className="flex flex-col gap-4 mt-4">
      <SojCard className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="font-medium text-sm md:text-base">Usuários da Organização</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {orgLoading ? "Carregando…" : `${users.length} de ${effectiveMaxUsers} ${effectiveMaxUsers === 1 ? "usuário" : "usuários"} do plano`}
            </p>
          </div>
          {canManage && !orgLoading && (
            reachedFreeUserLimit ? (
              <button
                onClick={handleUpgradeForMoreUsers}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-primary/30 text-primary text-sm font-medium hover:bg-primary-dim"
                title={`Seu plano permite até ${effectiveMaxUsers} ${effectiveMaxUsers === 1 ? "usuário" : "usuários"} na organização`}
              >
                <UserPlus className="h-3.5 w-3.5" /> Fazer upgrade para adicionar mais usuários
              </button>
            ) : (
              <button
                onClick={() => setInviteOpen(true)}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
              >
                <UserPlus className="h-3.5 w-3.5" /> Convidar usuário
              </button>
            )
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
                  {(u.social_name || u.name || u.email)[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {u.social_name || u.name || u.email}
                    {isMe && <span className="text-xs text-muted-foreground ml-2">(você)</span>}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isMe && (
                    <button
                      onClick={openEditSelf}
                      className="h-9 w-9 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:bg-muted/40"
                      aria-label="Editar meus dados"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
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

      {canManage && pendingInvites.length > 0 && (
        <SojCard className="flex flex-col gap-3">
          <h3 className="font-medium text-sm md:text-base">Convites pendentes</h3>
          <div className="flex flex-col divide-y divide-border">
            {pendingInvites.map((inv) => (
              <div key={inv.id} className="flex items-center gap-3 py-3">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{inv.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {ROLE_LABELS[inv.role] ?? inv.role} · enviado em{" "}
                    {new Date(inv.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(`https://app.ponderum.com/login?invite=${inv.token}`);
                    } catch {
                      // clipboard indisponível -- segue sem copiar
                    }
                  }}
                  className="h-9 w-9 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:bg-muted/40 shrink-0"
                  aria-label="Copiar link do convite"
                  title="Copiar link do convite"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleRevokeInvite(inv)}
                  className="h-9 w-9 rounded-md border border-border flex items-center justify-center text-destructive hover:bg-muted/40 shrink-0"
                  aria-label="Cancelar convite"
                  title="Cancelar convite"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </SojCard>
      )}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Convidar usuário</DialogTitle>
            <DialogDescription>
              Enviamos um e-mail de convite pra essa pessoa (você também recebe o link, caso prefira compartilhar manualmente). Ela entra na sua organização ao se cadastrar com esse e-mail.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input
                type="email"
                value={inviteForm.email}
                onChange={(e) => { setInviteForm({ ...inviteForm, email: e.target.value }); setInviteErrors({}); }}
                placeholder="convidado@empresa.com"
                className={inviteErrors.email ? "border-destructive/70" : ""}
              />
              {inviteErrors.email && <p className="text-[11px] text-destructive">{inviteErrors.email}</p>}
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
            <button
              onClick={handleSendInvite}
              disabled={inviteSubmitting}
              className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 inline-flex items-center gap-2 disabled:opacity-50"
            >
              <Mail className="h-3.5 w-3.5" /> {inviteSubmitting ? "Gerando convite…" : "Gerar convite"}
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

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar meus dados</DialogTitle>
            <DialogDescription>
              Email e CPF/CNPJ da organização só podem ser alterados com o suporte da Ponderum.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Nome</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Seu nome"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Nome social</Label>
              <Input
                value={editForm.socialName}
                onChange={(e) => setEditForm((f) => ({ ...f, socialName: e.target.value }))}
                placeholder="Opcional"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">WhatsApp / Celular</Label>
              <Input
                type="tel"
                value={editForm.phone}
                onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+55 (11) 99999-9999"
              />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setEditOpen(false)} className="h-10 px-5 rounded-lg border border-border text-sm hover:bg-muted/40">
              Cancelar
            </button>
            <button
              onClick={handleSaveSelf}
              disabled={savingEdit || !editForm.name.trim()}
              className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {savingEdit ? "Salvando..." : "Salvar"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
