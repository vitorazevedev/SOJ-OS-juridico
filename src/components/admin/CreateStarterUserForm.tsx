import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SojCard } from "@/components/layout/Primitives";
import { Loader2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { formatDocument, validateDocument } from "@/lib/brazilianDocs";

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

const EMPTY = { name: "", socialName: "", orgName: "", ddi: "+55", phone: "", cnpj: "", email: "" };
type FieldErrors = Partial<Record<"name" | "orgName" | "phone" | "cnpj" | "email", string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Instabilidade de verificação de JWT do lado do Supabase (coexistência de
// chave legada + chaves novas de assinatura) — intermitente e não é erro de
// dado, então vale tentar de novo automaticamente antes de mostrar erro.
const TRANSIENT_ERROR_RE = /invalid jwt|unable to parse or verify signature|unrecognized jwt kid/i;

async function invokeCreateUser(body: Record<string, unknown>, attempts = 3): Promise<{ data?: { actionLink: string; emailSent: boolean }; error?: string }> {
  let lastMessage = "Erro ao cadastrar usuário";
  for (let i = 0; i < attempts; i++) {
    const { data, error } = await supabase.functions.invoke("admin-create-user", { body });
    if (!error && !data?.error) return { data };

    // FunctionsHttpError.message é um texto genérico de "non-2xx status
    // code" — a mensagem real vem no corpo da resposta, via error.context.
    let message = data?.error ?? "Erro ao cadastrar usuário";
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

    // Confia no sinal explícito da função quando ele existe; cai pro texto
    // (erro de gateway, que nem chega a rodar o código da função) senão.
    const isTransient = retryableFlag || TRANSIENT_ERROR_RE.test(message);
    if (!isTransient || i === attempts - 1) return { error: message };
    await new Promise((r) => setTimeout(r, 500 * (i + 1)));
  }
  return { error: lastMessage };
}

export function CreateStarterUserForm() {
  const [form, setForm] = useState(EMPTY);
  const [sendEmail, setSendEmail] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ actionLink: string; emailSent: boolean } | null>(null);
  const [copied, setCopied] = useState<"link" | "template" | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const set = <K extends keyof typeof form>(key: K, value: typeof form[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleCnpjChange = (raw: string) => {
    const formatted = formatDocument(raw);
    set("cnpj", formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const doc = validateDocument(form.cnpj);
    const errs: FieldErrors = {};
    if (!form.name.trim()) errs.name = "Informe o nome";
    if (!form.orgName.trim()) errs.orgName = "Informe a organização";
    if (!form.phone.trim()) errs.phone = "Informe o WhatsApp/celular";
    if (!form.email.trim()) errs.email = "Informe o email";
    else if (!EMAIL_RE.test(form.email.trim())) errs.email = "Email inválido";
    if (!form.cnpj.trim()) errs.cnpj = "Informe um CPF ou CNPJ";
    else if (!doc.valid) errs.cnpj = `${doc.type === "cpf" ? "CPF" : "CNPJ"} inválido`;

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      toast.error("Preencha todos os campos corretamente");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await invokeCreateUser({
        name: form.name.trim(),
        socialName: form.socialName.trim() || null,
        orgName: form.orgName.trim(),
        ddi: form.ddi.trim(),
        phone: form.phone.trim(),
        cnpj: form.cnpj.trim(),
        email: form.email.trim(),
        sendEmail,
      });
      if (error || !data) {
        toast.error(error ?? "Erro ao cadastrar usuário");
        return;
      }
      setResult({ actionLink: data.actionLink, emailSent: data.emailSent });
      toast.success("Usuário cadastrado com sucesso!");
      setForm(EMPTY);
      setFieldErrors({});
    } catch {
      toast.error("Erro ao cadastrar usuário");
    } finally {
      setLoading(false);
    }
  };

  const whatsappTemplate = (link: string) =>
    `Bem-vindo(a) à Ponderum!\nSua conta foi criada com sucesso.\n\nPara acessar, clique no link abaixo e crie sua senha:\n\n${link}\n\nQualquer dúvida, estamos à disposição!`;

  const copy = async (text: string, which: "link" | "template") => {
    await navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <SojCard className="flex flex-col gap-4 p-5">
      <div>
        <h2 className="text-sm font-medium">Cadastrar novo usuário — Plano Starter</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Para clientes que fecharam o plano pelo WhatsApp e ainda não têm conta na plataforma.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="cu-name">Nome *</Label>
            <Input id="cu-name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Maria Silva"
              className={cn(fieldErrors.name && "border-destructive/70")}
            />
            {fieldErrors.name && <p className="text-[11px] text-destructive">{fieldErrors.name}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="cu-social-name">Nome social</Label>
            <Input id="cu-social-name" value={form.socialName} onChange={(e) => set("socialName", e.target.value)} placeholder="Opcional" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="cu-org">Nome da organização *</Label>
            <Input id="cu-org" value={form.orgName} onChange={(e) => set("orgName", e.target.value)} placeholder="Acme Advocacia"
              className={cn(fieldErrors.orgName && "border-destructive/70")}
            />
            {fieldErrors.orgName && <p className="text-[11px] text-destructive">{fieldErrors.orgName}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="cu-phone">WhatsApp / Celular *</Label>
            <div className="flex gap-2">
              <Input
                id="cu-ddi" value={form.ddi} aria-label="DDI (código do país)"
                onChange={(e) => {
                  const newDdi = `+${e.target.value.replace(/\D/g, "").slice(0, 4)}`;
                  set("ddi", newDdi);
                  set("phone", maskPhone(form.phone, newDdi));
                }}
                maxLength={5} className="w-16 shrink-0 text-center px-1"
              />
              <Input
                id="cu-phone" type="tel" value={form.phone} placeholder="(11) 99999-9999"
                onChange={(e) => set("phone", maskPhone(e.target.value, form.ddi))}
                maxLength={15} className={cn("flex-1", fieldErrors.phone && "border-destructive/70")}
              />
            </div>
            {fieldErrors.phone && <p className="text-[11px] text-destructive">{fieldErrors.phone}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="cu-cnpj">CPF ou CNPJ *</Label>
            <Input
              id="cu-cnpj" value={form.cnpj} placeholder="000.000.000-00 ou 00.000.000/0000-00"
              onChange={(e) => handleCnpjChange(e.target.value)} maxLength={18}
              className={cn(fieldErrors.cnpj && "border-destructive/70")}
            />
            {fieldErrors.cnpj && <p className="text-[11px] text-destructive">{fieldErrors.cnpj}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="cu-email">Email *</Label>
            <Input id="cu-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="voce@empresa.com"
              className={cn(fieldErrors.email && "border-destructive/70")}
            />
            {fieldErrors.email && <p className="text-[11px] text-destructive">{fieldErrors.email}</p>}
          </div>
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
          Cadastrar usuário
        </Button>
      </form>

      {result && (
        <div className="flex flex-col gap-2 rounded-lg border border-primary/30 bg-primary-dim p-4">
          <p className="text-sm font-medium">
            Usuário cadastrado{result.emailSent ? " — email de onboarding enviado" : ""}.
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
    </SojCard>
  );
}
