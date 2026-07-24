import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { usePonderumPermissions } from "@/hooks/usePonderumPermissions";
import { SojCard } from "@/components/layout/Primitives";
import { Loader2, AlertTriangle, ExternalLink } from "lucide-react";
import { env } from "@/config/env";
import { StatsGrid } from "@/components/admin/StatsGrid";
import { AnalysesChart } from "@/components/admin/AnalysesChart";
import { CronHealthCard } from "@/components/admin/CronHealthCard";
import { WaitlistTable } from "@/components/admin/WaitlistTable";
import { RecentActivityFeed } from "@/components/admin/RecentActivityFeed";
import { OrganizationsTable } from "@/components/admin/OrganizationsTable";
import { FeedbacksList } from "@/components/admin/FeedbacksList";
import { PonderumStaffManagement } from "@/components/admin/PonderumStaffManagement";
import type {
  Stats, WaitlistEntry, Feedback, Org, DayCount, Contract, CronJob,
} from "@/lib/adminDashboard";

export default function Admin() {
  const navigate  = useNavigate();
  const { canViewDev } = usePonderumPermissions();
  const [loading, setLoading]   = useState(true);
  const [stats, setStats]       = useState<Stats | null>(null);
  const [feedbacks, setFeedbacks]         = useState<Feedback[]>([]);
  const [orgs, setOrgs]                   = useState<Org[]>([]);
  const [analysesPerDay, setAnalysesPerDay] = useState<DayCount[]>([]);
  const [recentContracts, setRecentContracts] = useState<Contract[]>([]);
  const [cronHealth, setCronHealth]         = useState<CronJob[]>([]);
  const [waitlist, setWaitlist]             = useState<WaitlistEntry[]>([]);

  useEffect(() => {
    if (canViewDev === false) return;
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
  }, [canViewDev]);

  if (!canViewDev && !loading) return (
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

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-5xl mx-auto">

      {/* Cabeçalho */}
      <div>
        <h1 className="text-lg md:text-2xl font-semibold tracking-tight">Painel do Desenvolvedor</h1>
        <p className="text-xs text-muted-foreground mt-0.5 font-mono">Ponderum · Visão interna</p>
      </div>

      {stats && <StatsGrid stats={stats} />}

      <AnalysesChart analysesPerDay={analysesPerDay} />

      <CronHealthCard cronHealth={cronHealth} />

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

      <WaitlistTable waitlist={waitlist} />

      <RecentActivityFeed recentContracts={recentContracts} />

      {/* Canal de suporte — botão flutuante "Suporte" no app abre este WhatsApp */}
      <SojCard className="flex items-center justify-between gap-4 p-5">
        <div>
          <p className="text-sm font-medium">Canal de suporte</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Botão flutuante "Suporte" no app abre o WhatsApp (55) 11 96488-9002 com uma mensagem pronta.
          </p>
        </div>
        <span className="text-[10px] font-mono text-primary px-3 py-1.5 border border-primary/30 bg-primary-dim rounded-lg">Ativo</span>
      </SojCard>

      <OrganizationsTable orgs={orgs} />

      <PonderumStaffManagement />

      <FeedbacksList feedbacks={feedbacks} />

    </div>
  );
}
