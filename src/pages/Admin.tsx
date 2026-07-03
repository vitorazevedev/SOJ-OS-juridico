import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { SojCard } from "@/components/layout/Primitives";
import {
  Loader2, Building2, FileText, ScanSearch, MessageSquare,
  ThumbsUp, ThumbsDown, AlertTriangle, ExternalLink,
  CheckCircle2, XCircle, Clock, Activity, UserPlus,
} from "lucide-react";
import { env } from "@/config/env";
import { cn } from "@/lib/utils";

// Custo estimado por operação (valores do doc de custos para o Kober)
const COST_PARSE_BRL  = 0.05; // Haiku — parse/extração de texto
const COST_ANALYSIS_BRL = 0.45; // Sonnet — análise jurídica

type Stats = {
  total_orgs: number;
  total_contracts: number;
  contracts_this_month: number;
  total_analyses: number;
  analyses_this_month: number;
  total_feedbacks: number;
  total_waitlist: number;
};

type WaitlistEntry = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  role: string | null;
  message: string | null;
  created_at: string;
};
type Feedback = { id: string; category: string; message: string; page_url: string | null; created_at: string };
type Org       = { id: string; name: string; plan_id: string; created_at: string; contract_count: number; analysis_count: number };
type DayCount  = { day: string; count: number };
type Contract  = { id: string; name: string; status: string; created_at: string; org_name: string };
type CronJob   = { jobname: string; schedule: string; status: string | null; start_time: string | null; return_message: string | null };

const PLAN_LABEL: Record<string, string> = { starter: "Starter", pro: "Pro", enterprise: "Enterprise" };
const CAT_LABEL:  Record<string, string> = { utilidade: "Sugestão", erro: "Erro", omissao: "Omissão" };
const STATUS_LABEL: Record<string, string> = {
  aguardando: "Aguardando", em_analise: "Pronto p/ análise", analisado: "Analisado",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}
function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function Admin() {
  const navigate  = useNavigate();
  const isAdmin   = useIsAdmin();
  const [loading, setLoading]   = useState(true);
  const [stats, setStats]       = useState<Stats | null>(null);
  const [feedbacks, setFeedbacks]         = useState<Feedback[]>([]);
  const [orgs, setOrgs]                   = useState<Org[]>([]);
  const [analysesPerDay, setAnalysesPerDay] = useState<DayCount[]>([]);
  const [recentContracts, setRecentContracts] = useState<Contract[]>([]);
  const [cronHealth, setCronHealth]         = useState<CronJob[]>([]);
  const [waitlist, setWaitlist]             = useState<WaitlistEntry[]>([]);

  useEffect(() => {
    if (isAdmin === false) return;
    supabase.rpc("get_admin_dashboard").then(({ data, error }) => {
      if (error || !data) { setLoading(false); return; }
      const d = data as {
        stats: Stats; feedbacks: Feedback[]; organizations: Org[];
        analyses_per_day: DayCount[]; recent_contracts: Contract[]; cron_health: CronJob[];
        waitlist: WaitlistEntry[];
      };
      setStats(d.stats);
      setFeedbacks(d.feedbacks ?? []);
      setOrgs(d.organizations ?? []);
      setAnalysesPerDay(d.analyses_per_day ?? []);
      setRecentContracts(d.recent_contracts ?? []);
      setWaitlist(d.waitlist ?? []);
      setCronHealth(d.cron_health ?? []);
      setLoading(false);
    });
  }, [isAdmin]);

  if (!isAdmin && !loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <p className="text-sm text-muted-foreground">Acesso restrito.</p>
      <button onClick={() => navigate("/")} className="text-xs text-primary underline">Voltar</button>
    </div>
  );

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );

  const estimatedCostBRL = stats
    ? stats.contracts_this_month * COST_PARSE_BRL + stats.analyses_this_month * COST_ANALYSIS_BRL
    : 0;

  const maxCount = Math.max(...analysesPerDay.map((d) => d.count), 1);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-5xl mx-auto">

      {/* Cabeçalho */}
      <div>
        <h1 className="font-cormorant text-2xl font-light tracking-wide">Painel do Desenvolvedor</h1>
        <p className="text-xs text-muted-foreground mt-0.5 font-mono">Ponderum · Visão interna</p>
      </div>

      {/* Stats + Custo */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: "Waitlist",         value: stats.total_waitlist,       icon: UserPlus },
            { label: "Organizações",    value: stats.total_orgs,           icon: Building2 },
            { label: "Contratos/mês",   value: stats.contracts_this_month, icon: FileText },
            { label: "Análises/mês",    value: stats.analyses_this_month,  icon: ScanSearch },
            { label: "Feedbacks",       value: stats.total_feedbacks,      icon: MessageSquare },
          ].map(({ label, value, icon: Icon }) => (
            <SojCard key={label} className="flex flex-col gap-1 p-4">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Icon className="h-3.5 w-3.5" />
                <span className="text-[10px] font-mono uppercase tracking-wider">{label}</span>
              </div>
              <p className="text-2xl font-semibold tabular-nums">{value}</p>
            </SojCard>
          ))}

          {/* Custo estimado */}
          <SojCard className="flex flex-col gap-1 p-4 border-primary/30">
            <div className="flex items-center gap-1.5 text-primary">
              <span className="text-[10px] font-mono uppercase tracking-wider">Custo est. mês</span>
            </div>
            <p className="text-2xl font-semibold tabular-nums text-primary">{fmtBRL(estimatedCostBRL)}</p>
            <p className="text-[10px] text-muted-foreground leading-tight">
              {stats.contracts_this_month} × R$0,05 (parse) + {stats.analyses_this_month} × R$0,45 (análise)
            </p>
          </SojCard>
        </div>
      )}

      {/* Análises por dia — gráfico de barras simples */}
      <SojCard className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-medium">Análises — últimos 7 dias</h2>
        </div>
        <div className="flex items-end gap-2 h-24">
          {analysesPerDay.map(({ day, count }) => (
            <div key={day} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] tabular-nums text-muted-foreground">{count > 0 ? count : ""}</span>
              <div
                className="w-full rounded-t-md bg-primary/70 transition-all"
                style={{ height: `${Math.max((count / maxCount) * 80, count > 0 ? 6 : 2)}px` }}
              />
              <span className="text-[10px] text-muted-foreground font-mono">{day}</span>
            </div>
          ))}
        </div>
      </SojCard>

      {/* Saúde das funções agendadas */}
      <SojCard className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Saúde das funções agendadas</h2>
        {cronHealth.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">Nenhum job cron encontrado.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {cronHealth.map((job) => (
              <div key={job.jobname} className="flex items-center gap-3 py-3">
                <div className="shrink-0">
                  {job.status === "succeeded" ? (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  ) : job.status === "failed" ? (
                    <XCircle className="h-4 w-4 text-risk-critical" />
                  ) : (
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono">{job.jobname}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{job.schedule}</p>
                  {job.status === "failed" && job.return_message && (
                    <p className="text-[10px] text-risk-critical mt-0.5 truncate">{job.return_message}</p>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {job.start_time ? fmtDate(job.start_time) : "nunca executou"}
                </span>
              </div>
            ))}
          </div>
        )}
      </SojCard>

      {/* Erros — Sentry */}
      <SojCard className="flex items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-risk-critical-dim flex items-center justify-center shrink-0">
            <AlertTriangle className="h-4 w-4 text-risk-critical" />
          </div>
          <div>
            <p className="text-sm font-medium">Monitoramento de erros</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Erros de JavaScript em produção são capturados pelo Sentry em tempo real.
            </p>
          </div>
        </div>
        <a
          href={env.sentryProjectUrl ?? "https://sentry.io"}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 h-9 px-4 rounded-lg border border-border text-sm hover:bg-muted/40 transition-colors shrink-0"
        >
          Ver no Sentry <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </SojCard>

      {/* Waitlist — solicitações de acesso antecipado */}
      <SojCard className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Acesso antecipado — waitlist</h2>
          <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {waitlist.length} solicitação{waitlist.length !== 1 ? "ões" : ""}
          </span>
        </div>
        {waitlist.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">Nenhuma solicitação ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  {["Nome", "Email", "Empresa", "Perfil", "Data"].map((h, i) => (
                    <th key={h} className={cn("pb-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground", i >= 3 && "text-right")}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {waitlist.map((w) => (
                  <tr key={w.id}>
                    <td className="py-2.5 font-medium text-sm">{w.name}</td>
                    <td className="py-2.5 text-xs text-muted-foreground">{w.email}</td>
                    <td className="py-2.5 text-xs text-muted-foreground">{w.company ?? "—"}</td>
                    <td className="py-2.5 text-right text-xs text-muted-foreground">{w.role ?? "—"}</td>
                    <td className="py-2.5 text-right text-xs text-muted-foreground">{fmtDate(w.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SojCard>

      {/* Feed de atividade recente */}
      <SojCard className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Atividade recente</h2>
        {recentContracts.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">Nenhum contrato ainda.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {recentContracts.map((c) => (
              <div key={c.id} className="flex items-center gap-3 py-2.5">
                <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs truncate">{c.name}</p>
                  <p className="text-[10px] text-muted-foreground">{c.org_name}</p>
                </div>
                <span className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0",
                  c.status === "analisado" ? "bg-primary-dim text-primary"
                    : c.status === "em_analise" ? "bg-info/10 text-info"
                    : "bg-muted text-muted-foreground"
                )}>
                  {STATUS_LABEL[c.status] ?? c.status}
                </span>
                <span className="text-[10px] text-muted-foreground shrink-0">{fmtDate(c.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </SojCard>

      {/* Canal de suporte (placeholder — email e WhatsApp a definir) */}
      <SojCard className="flex items-center justify-between gap-4 p-5 opacity-50">
        <div>
          <p className="text-sm font-medium">Canal de suporte</p>
          <p className="text-xs text-muted-foreground mt-0.5">E-mail e WhatsApp a configurar.</p>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground px-3 py-1.5 border border-dashed border-border rounded-lg">Em breve</span>
      </SojCard>

      {/* Organizações */}
      <SojCard className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Organizações</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                {["Nome", "Plano", "Contratos", "Análises", "Criada em"].map((h, i) => (
                  <th key={h} className={cn("pb-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground", i > 1 && "text-right")}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orgs.map((org) => (
                <tr key={org.id}>
                  <td className="py-2.5 font-medium">{org.name}</td>
                  <td className="py-2.5">
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium",
                      org.plan_id === "pro" ? "bg-primary-dim text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      {PLAN_LABEL[org.plan_id] ?? org.plan_id}
                    </span>
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-muted-foreground">{org.contract_count}</td>
                  <td className="py-2.5 text-right tabular-nums text-muted-foreground">{org.analysis_count}</td>
                  <td className="py-2.5 text-right text-muted-foreground text-xs">{fmtDate(org.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SojCard>

      {/* Feedbacks */}
      <SojCard className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Feedbacks recebidos</h2>
        {feedbacks.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">Nenhum feedback ainda.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {feedbacks.map((fb) => (
              <div key={fb.id} className="flex items-start gap-3 py-3">
                <div className="mt-0.5 shrink-0">
                  {fb.message.startsWith("[análise] Sim") ? (
                    <ThumbsUp className="h-4 w-4 text-primary" />
                  ) : fb.message.startsWith("[análise] Não") ? (
                    <ThumbsDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                      {CAT_LABEL[fb.category] ?? fb.category}
                    </span>
                    {fb.page_url && <span className="text-[10px] text-muted-foreground/60 truncate">{fb.page_url}</span>}
                  </div>
                  <p className="text-sm">{fb.message}</p>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">{fmtDate(fb.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </SojCard>

    </div>
  );
}
