import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useIsAdmin } from "@/hooks/useIsAdmin";
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
import type {
  Stats, WaitlistEntry, Feedback, Org, DayCount, Contract, CronJob,
} from "@/lib/adminDashboard";

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

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-5xl mx-auto">

      {/* Cabeçalho */}
      <div>
        <h1 className="font-cormorant text-2xl font-light tracking-wide">Painel do Desenvolvedor</h1>
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

      {/* Canal de suporte (placeholder — email e WhatsApp a definir) */}
      <SojCard className="flex items-center justify-between gap-4 p-5 opacity-50">
        <div>
          <p className="text-sm font-medium">Canal de suporte</p>
          <p className="text-xs text-muted-foreground mt-0.5">E-mail e WhatsApp a configurar.</p>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground px-3 py-1.5 border border-dashed border-border rounded-lg">Em breve</span>
      </SojCard>

      <OrganizationsTable orgs={orgs} />

      <FeedbacksList feedbacks={feedbacks} />

    </div>
  );
}
