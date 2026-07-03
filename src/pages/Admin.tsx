import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { SojCard } from "@/components/layout/Primitives";
import { Loader2, Building2, FileText, ScanSearch, MessageSquare, ThumbsUp, ThumbsDown } from "lucide-react";

type Stats = {
  total_orgs: number;
  total_contracts: number;
  contracts_this_month: number;
  total_analyses: number;
  total_feedbacks: number;
};

type Feedback = {
  id: string;
  category: string;
  message: string;
  page_url: string | null;
  created_at: string;
};

type Org = {
  id: string;
  name: string;
  plan_id: string;
  created_at: string;
  contract_count: number;
  analysis_count: number;
};

const PLAN_LABEL: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise",
};

const CATEGORY_LABEL: Record<string, string> = {
  utilidade: "Sugestão",
  erro: "Erro",
  omissao: "Omissão",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function Admin() {
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [orgs, setOrgs] = useState<Org[]>([]);

  useEffect(() => {
    if (isAdmin === false) return;
    supabase.rpc("get_admin_dashboard").then(({ data, error }) => {
      if (error || !data) { setLoading(false); return; }
      const d = data as { stats: Stats; feedbacks: Feedback[]; organizations: Org[] };
      setStats(d.stats);
      setFeedbacks(d.feedbacks ?? []);
      setOrgs(d.organizations ?? []);
      setLoading(false);
    });
  }, [isAdmin]);

  if (!isAdmin && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <p className="text-sm text-muted-foreground">Acesso restrito.</p>
        <button onClick={() => navigate("/")} className="text-xs text-primary underline">Voltar</button>
      </div>
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-5xl mx-auto">
      <div>
        <h1 className="font-cormorant text-2xl font-light tracking-wide">Painel do Desenvolvedor</h1>
        <p className="text-xs text-muted-foreground mt-0.5 font-mono">Ponderum · Visão interna</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Organizações",       value: stats.total_orgs,           icon: Building2 },
            { label: "Contratos total",    value: stats.total_contracts,      icon: FileText },
            { label: "Contratos/mês",      value: stats.contracts_this_month, icon: FileText },
            { label: "Análises",           value: stats.total_analyses,       icon: ScanSearch },
            { label: "Feedbacks",          value: stats.total_feedbacks,      icon: MessageSquare },
          ].map(({ label, value, icon: Icon }) => (
            <SojCard key={label} className="flex flex-col gap-1 p-4">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Icon className="h-3.5 w-3.5" />
                <span className="text-[10px] font-mono uppercase tracking-wider">{label}</span>
              </div>
              <p className="text-2xl font-semibold tabular-nums">{value}</p>
            </SojCard>
          ))}
        </div>
      )}

      {/* Organizações */}
      <SojCard className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Organizações</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Nome</th>
                <th className="pb-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Plano</th>
                <th className="pb-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground text-right">Contratos</th>
                <th className="pb-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground text-right">Análises</th>
                <th className="pb-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground text-right">Criada em</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orgs.map((org) => (
                <tr key={org.id}>
                  <td className="py-2.5 font-medium">{org.name}</td>
                  <td className="py-2.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      org.plan_id === "pro" ? "bg-primary-dim text-primary" : "bg-muted text-muted-foreground"
                    }`}>
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
                      {CATEGORY_LABEL[fb.category] ?? fb.category}
                    </span>
                    {fb.page_url && (
                      <span className="text-[10px] text-muted-foreground/60 truncate">{fb.page_url}</span>
                    )}
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
