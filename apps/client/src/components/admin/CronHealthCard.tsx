import { SojCard } from "@/components/layout/Primitives";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { fmtDate, type CronJob } from "@/lib/adminDashboard";

export function CronHealthCard({ cronHealth }: { cronHealth: CronJob[] }) {
  return (
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
  );
}
