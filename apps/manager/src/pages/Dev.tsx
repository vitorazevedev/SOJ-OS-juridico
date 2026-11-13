import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { SojCard } from "@ponderum/ui";
import { Loader2, AlertTriangle, ExternalLink } from "lucide-react";
import { StatsGrid } from "@/components/dev/StatsGrid";
import { AnalysesChart } from "@/components/dev/AnalysesChart";
import { CronHealthCard } from "@/components/dev/CronHealthCard";
import { WaitlistTable } from "@/components/dev/WaitlistTable";
import { OrganizationsTable } from "@/components/dev/OrganizationsTable";
import { FeedbacksList } from "@/components/dev/FeedbacksList";
import { PonderumStaffManagement } from "@/components/dev/PonderumStaffManagement";
import { SupportChannelCard } from "@/components/dev/SupportChannelCard";
import { BillingDevSimulator } from "@/components/dev/BillingDevSimulator";
import { ChargebacksCard } from "@/components/dev/ChargebacksCard";
import type {
  Stats, WaitlistEntry, Feedback, Org, DayCount, CronJob,
} from "@/lib/adminDashboard";

export default function Dev() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [analysesPerDay, setAnalysesPerDay] = useState<DayCount[]>([]);
  const [cronHealth, setCronHealth] = useState<CronJob[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);

  useEffect(() => {
    supabase.rpc("get_admin_dashboard").then(({ data, error }) => {
      if (error || !data) { setLoading(false); return; }
      const d = data as {
        stats: Stats; feedbacks: Feedback[]; organizations: Org[];
        analyses_per_day: DayCount[]; cron_health: CronJob[];
        waitlist: WaitlistEntry[];
      };
      setStats(d.stats);
      setFeedbacks(d.feedbacks ?? []);
      setOrgs(d.organizations ?? []);
      setAnalysesPerDay(d.analyses_per_day ?? []);
      setWaitlist(d.waitlist ?? []);
      setCronHealth(d.cron_health ?? []);
      setLoading(false);
    });
  }, []);

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
          href="https://sentry.io"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 h-9 px-4 rounded-lg border border-border text-sm hover:bg-muted/40 transition-colors shrink-0"
        >
          Ver no Sentry <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </SojCard>

      <WaitlistTable waitlist={waitlist} />

      <SupportChannelCard />

      <OrganizationsTable orgs={orgs} />

      <PonderumStaffManagement />

      <ChargebacksCard />

      <BillingDevSimulator />

      <FeedbacksList feedbacks={feedbacks} />

    </div>
  );
}
