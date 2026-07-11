import { useState } from "react";
import { z } from "zod";
import { SojCard } from "@/components/layout/Primitives";
import { UserPlus, Shield, Trash2, Mail, X } from "lucide-react";
import { toast } from "sonner";
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
import { useAuth } from "@/features/auth/components/AuthProvider";
import { useOrgUsers, type OrgUser } from "@/hooks/useOrganization";

const inviteSchema = z.object({
  email: z.string().email("Email inválido"),
});

type InviteErrors = Partial<Record<"email", string>>;

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Membro",
};

export function UsersTab() {
  const { user } = useAuth();
  const { users, updateRole, removeUser } = useOrgUsers();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<OrgUser | null>(null);
  const [inviteForm, setInviteForm] = useState({ email: "", role: "member" });
  const [inviteErrors, setInviteErrors] = useState<InviteErrors>({});

  const myUser = users.find((u) => u.id === user?.id);
  const myRole = myUser?.role ?? "member";
  const canManage = myRole === "owner" || myRole === "admin";

  const handleRoleChange = async (u: OrgUser, role: string) => {
    try {
      await updateRole(u.id, role);
      toast.success(`Papel atualizado para ${ROLE_LABELS[role] ?? role}`);
    } catch (e) {
      toast.error("Erro ao alterar papel", { description: e instanceof Error ? e.message : undefined });
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

  const handleSendInvite = () => {
    const result = inviteSchema.safeParse(inviteForm);
    if (!result.success) {
      setInviteErrors({ email: result.error.issues[0]?.message });
      return;
    }
    setInviteErrors({});
    toast.success("Convite registrado", {
      description: `Compartilhe o link de cadastro com ${inviteForm.email}. O envio automático por email será habilitado em breve.`,
    });
    setInviteForm({ email: "", role: "member" });
    setInviteOpen(false);
  };

  return (
    <div className="flex flex-col gap-4 mt-4">
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
            <button onClick={handleSendInvite} className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 inline-flex items-center gap-2">
              <Mail className="h-3.5 w-3.5" /> Enviar convite
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
    </div>
  );
}
