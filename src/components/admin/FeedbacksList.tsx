import { SojCard } from "@/components/layout/Primitives";
import { MessageSquare, ThumbsDown, ThumbsUp } from "lucide-react";
import { CAT_LABEL, fmtDate, type Feedback } from "@/lib/adminDashboard";

export function FeedbacksList({ feedbacks }: { feedbacks: Feedback[] }) {
  return (
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
  );
}
