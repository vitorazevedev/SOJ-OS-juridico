import { useNavigate } from "react-router-dom";
import { SojCard, RiskBadge, StatusBadge } from "@/components/layout/Primitives";
import { VolumeExposureChart } from "@/components/layout/Charts";
import { useDashboard } from "@/hooks/useDashboard";
import { useAuth } from "@/features/auth/components/AuthProvider";
import { cn } from "@/lib/utils";
import { AlertTriangle, ArrowRight, CalendarClock, FileText, Loader2, ShieldCheck, Sparkles, TrendingUp, Upload } from "lucide-react";

// ─── helpers ─────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function formatToday() {
  return new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
}

function formatBRL(cents: number) {
  const v = cents / 100;
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `R$ ${Math.round(v / 1_000)}K`;
  return `R$ ${v.toLocaleString("pt-BR")}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

const statusLabel = (status: string) => {
  if (status === "analisado") return "Analisado";
  if (status === "em_analise") return "Pronto p/ análise";
  if (status === "aguardando") return "Aguardando";
  return status;
};

// ─── Welcome hero (first-run) ────────────────────────────────────────────────

function WelcomeHero({ onUpload, onGenerate }: { onUpload: () => void; onGenerate: () => void }) {
  return (
    <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-background to-background p-6 md:p-8">
      <div className="max-w-2xl">
        <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-3">Primeiros passos</p>
        <h2 className="text-xl md:text-2xl font-semibold leading-snug">
          Seu portfólio jurídico começa aqui
        </h2>
        <p className="text-sm text-muted-foreground mt-2 mb-6 leading-relaxed">
          Faça upload de um contrato ou gere um novo documento para começar a monitorar riscos, prazos e exposição financeira em tempo real.
        </p>

        <div className="flex flex-wrap gap-3 mb-8">
          <button
            onClick={onUpload}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-background text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Upload className="h-4 w-4" />
            Enviar contrato
          </button>
          <button
            onClick={onGenerate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted/40 transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            Gerar contrato
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: ShieldCheck, title: "Análise de risco", desc: "Score 0-100 por cláusula com recomendações jurídicas" },
            { icon: TrendingUp, title: "Impacto financeiro", desc: "Exposição em R$ por cláusula crítica identificada" },
            { icon: CalendarClock, title: "Alertas de prazo", desc: "Notificações 30, 15 e 7 dias antes do vencimento" },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex gap-3 p-3 rounded-xl bg-muted/20 border border-border/50">
              <div className="mt-0.5 h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">{title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── KPI card ────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, hint, highlight,
}: { label: string; value: string; hint: string; highlight?: boolean }) {
  return (
    <SojCard className="p-3.5 md:p-5">
      <p className="text-[10px] md:text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="flex items-baseline gap-2 mt-2">
        <span className={cn("text-xl md:text-3xl font-semibold tracking-tight tabular-nums", highlight && "text-risk-critical")}>
          {value}
        </span>
      </div>
      <p className="text-[10px] md:text-xs text-muted-foreground mt-1.5">{hint}</p>
    </SojCard>
  );
}

// ─── main ─────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { summary, recentContracts, topRisks, upcoming, loading } = useDashboard();

  const firstName =
    (user?.user_metadata?.name as string | undefined)?.split(" ")[0] ??
    user?.email?.split("@")[0] ?? "Usuário";

  const isEmpty = !loading && summary.total_contracts === 0;

  return (
    <div className="flex flex-col gap-4 md:gap-6 max-w-[1400px] mx-auto animate-fade-in">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            {greeting()}, {firstName} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Portfólio jurídico · {formatToday()}</p>
        </div>
        {!isEmpty && summary.urgent_obligations > 0 && (
          <button
            onClick={() => navigate("/obligations")}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-risk-critical-dim text-risk-critical text-xs font-medium hover:opacity-80 transition-opacity"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            {summary.urgent_obligations} obrigação{summary.urgent_obligations > 1 ? "ões" : ""} urgente{summary.urgent_obligations > 1 ? "s" : ""}
          </button>
        )}
      </div>

      {/* First-run: no contracts yet */}
      {isEmpty && (
        <WelcomeHero
          onUpload={() => navigate("/contracts")}
          onGenerate={() => navigate("/generator")}
        />
      )}

      {/* KPIs */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SojCard key={i} className="p-3.5 md:p-5 animate-pulse">
              <div className="h-3 w-24 bg-muted/60 rounded mb-3" />
              <div className="h-8 w-16 bg-muted/60 rounded mb-2" />
              <div className="h-2.5 w-20 bg-muted/40 rounded" />
            </SojCard>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-4">
          <KpiCard
            label="Total de contratos"
            value={String(summary.total_contracts)}
            hint="Na sua organização"
          />
          <KpiCard
            label="Exposição total"
            value={summary.total_exposure_cents > 0 ? formatBRL(summary.total_exposure_cents) : "—"}
            hint="Soma das análises de risco"
            highlight={summary.total_exposure_cents > 0}
          />
          <KpiCard
            label="Score médio de risco"
            value={summary.avg_risk_score > 0 ? String(Math.round(summary.avg_risk_score)) : "—"}
            hint="Contratos analisados"
            highlight={summary.avg_risk_score >= 65}
          />
          <KpiCard
            label="Obrigações pendentes"
            value={String(summary.pending_obligations)}
            hint="Nos próximos 30 dias"
            highlight={summary.urgent_obligations > 0}
          />
        </div>
      )}

      {/* Chart */}
      <SojCard>
        <div className="flex items-start justify-between mb-1">
          <div>
            <h3 className="font-medium text-sm md:text-base">Volume & Exposição Financeira</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Contratos analisados e exposição acumulada por mês</p>
          </div>
        </div>
        <VolumeExposureChart />
      </SojCard>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Top riscos */}
        <SojCard>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-risk-critical" />
            <h3 className="font-medium text-sm md:text-base">Top Riscos</h3>
          </div>
          {loading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex justify-between items-center animate-pulse">
                  <div className="h-3 w-32 bg-muted/60 rounded" />
                  <div className="h-5 w-16 bg-muted/40 rounded-full" />
                </div>
              ))}
            </div>
          ) : topRisks.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Nenhum contrato analisado ainda</p>
              <button onClick={() => navigate("/contracts")} className="text-xs text-primary hover:underline">
                Fazer upload →
              </button>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {topRisks.map((c) => (
                <button
                  key={c.id}
                  onClick={() => navigate(`/analysis/${c.id}`)}
                  className="flex items-center justify-between gap-3 py-3 text-left hover:opacity-80 active:opacity-60 transition-opacity first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{c.type ?? c.party ?? "—"}</p>
                  </div>
                  {c.risk_score != null && <RiskBadge score={c.risk_score} />}
                </button>
              ))}
            </div>
          )}
        </SojCard>

        {/* Obrigações próximas */}
        <SojCard className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium text-sm md:text-base">Obrigações Próximas</h3>
            </div>
            <button onClick={() => navigate("/obligations")} className="text-xs text-primary hover:underline">
              Ver todas →
            </button>
          </div>
          {loading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex justify-between items-center animate-pulse">
                  <div className="h-3 w-48 bg-muted/60 rounded" />
                  <div className="h-5 w-20 bg-muted/40 rounded-full" />
                </div>
              ))}
            </div>
          ) : upcoming.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <CalendarClock className="h-5 w-5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Nenhuma obrigação nos próximos 30 dias</p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {upcoming.map((o) => {
                const days = daysUntil(o.due_date);
                const urgent = days <= 7;
                return (
                  <button
                    key={o.id}
                    onClick={() => navigate("/obligations")}
                    className="flex items-center justify-between gap-3 py-3 text-left hover:opacity-80 transition-opacity first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{o.description}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{o.contract_name ?? "—"}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={cn("text-xs font-medium tabular-nums", urgent ? "text-risk-critical" : "text-muted-foreground")}>
                        {days === 0 ? "Hoje" : days === 1 ? "Amanhã" : `${days}d`}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{fmtDate(o.due_date)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </SojCard>
      </div>

      {/* Contratos recentes */}
      <SojCard padding={false}>
        <div className="flex items-center justify-between p-4 md:px-5 md:py-4">
          <h3 className="font-medium text-sm md:text-base">Contratos Recentes</h3>
          <button onClick={() => navigate("/contracts")} className="text-xs text-primary hover:underline">
            Ver todos →
          </button>
        </div>

        <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_24px] gap-3 px-5 py-2 border-t border-border text-[10px] uppercase tracking-wider text-muted-foreground">
          <span>Contrato</span>
          <span>Tipo</span>
          <span>Status</span>
          <span>Score</span>
          <span>Data</span>
          <span />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground gap-2 border-t border-border">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
          </div>
        ) : recentContracts.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-14 text-center border-t border-border">
            <div className="h-12 w-12 rounded-full bg-muted/40 flex items-center justify-center">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Nenhum contrato cadastrado</p>
              <p className="text-xs text-muted-foreground mt-1">Envie um PDF ou DOCX para começar a análise de risco</p>
            </div>
            <button
              onClick={() => navigate("/contracts")}
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
            >
              Enviar primeiro contrato <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div>
            {recentContracts.map((c) => (
              <button
                key={c.id}
                onClick={() => navigate(`/analysis/${c.id}`)}
                className="w-full grid grid-cols-[1fr_auto] md:grid-cols-[2fr_1fr_1fr_1fr_1fr_24px] items-center gap-3 px-4 md:px-5 py-3 text-left border-t border-border hover:bg-muted/30 active:bg-muted/30 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{c.party}</p>
                </div>
                <span className="hidden md:block text-sm text-muted-foreground truncate">{c.type || "—"}</span>
                <span className="hidden md:block">
                  <StatusBadge status={statusLabel(c.status) as never} />
                </span>
                <span className="hidden md:block">
                  {c.risk_score != null ? <RiskBadge score={c.risk_score} /> : <span className="text-xs text-muted-foreground">—</span>}
                </span>
                <span className="hidden md:block text-sm text-muted-foreground tabular-nums">{fmtDate(c.created_at)}</span>
                <span className="text-muted-foreground text-xs justify-self-end">›</span>
              </button>
            ))}
          </div>
        )}
      </SojCard>

      {/* Resumo de status (só aparece quando há contratos) */}
      {!loading && summary.total_contracts > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Analisados", count: recentContracts.filter(c => c.status === "analisado").length, color: "text-primary", bg: "bg-primary-dim" },
            { label: "Em análise", count: recentContracts.filter(c => c.status === "em_analise").length, color: "text-info", bg: "bg-info-dim" },
            { label: "Aguardando", count: recentContracts.filter(c => c.status === "aguardando").length, color: "text-muted-foreground", bg: "bg-muted/30" },
          ].map((s) => (
            <button
              key={s.label}
              onClick={() => navigate("/contracts")}
              className={cn("rounded-xl p-3 md:p-4 text-center hover:opacity-80 transition-opacity", s.bg)}
            >
              <p className={cn("text-2xl md:text-3xl font-semibold tabular-nums", s.color)}>{s.count}</p>
              <p className="text-[11px] md:text-xs text-muted-foreground mt-1">{s.label}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
