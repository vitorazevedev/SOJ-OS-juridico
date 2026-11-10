import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePonderumPermissions } from "@/hooks/usePonderumPermissions";
import { SojCard } from "@/components/layout/Primitives";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { ChargebacksCard } from "@/components/admin/ChargebacksCard";
import {
  Loader2, TrendingUp, Percent, Wallet, Clock, CheckCircle2, Users, AlertTriangle, UserMinus, Download,
} from "lucide-react";
import { jsPDF } from "jspdf";
import { supabase } from "@/lib/supabase";
import { fmtBRL } from "@/lib/adminDashboard";
import { downloadBlob } from "@/lib/contractDocs";

// Modulo de Pagamentos, Fase 5b -- painel financeiro (spec Peça 9).
// Números vêm de get_admin_finance_summary()/list_admin_payments() —
// RPCs security definer porque payments/subscriptions têm RLS restrita à
// própria organização (staff precisa ver de todas).

type FinanceSummary = {
  sold_cents_month: number;
  fee_cents_month: number;
  net_cents_month: number;
  to_release_cents: number;
  released_cents: number;
  mrr_cents: number;
  active_subscribers: number;
  past_due_subscribers: number;
  churn_month: number;
  open_chargebacks: number;
};

type AdminPayment = {
  id: string;
  organization_name: string;
  method: string;
  status: string;
  amount_cents: number;
  fee_cents: number | null;
  net_cents: number | null;
  money_release_date: string | null;
  released: boolean;
  approved_at: string | null;
  created_at: string;
};

export default function AdminFinance() {
  const navigate = useNavigate();
  const { canViewDev, loading: permsLoading } = usePonderumPermissions();
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [payments, setPayments] = useState<AdminPayment[] | null>(null);

  useEffect(() => {
    if (!canViewDev) return;
    supabase.rpc("get_admin_finance_summary").then(({ data }) => setSummary(data as FinanceSummary | null));
    supabase.rpc("list_admin_payments", { p_limit: 200 }).then(({ data }) => setPayments((data as AdminPayment[]) ?? []));
  }, [canViewDev]);

  const toReleaseByDate = useMemo(() => {
    if (!payments) return [];
    const groups = new Map<string, number>();
    for (const p of payments) {
      if (p.status !== "approved" || p.released || !p.money_release_date) continue;
      const day = p.money_release_date.slice(0, 10);
      groups.set(day, (groups.get(day) ?? 0) + (p.net_cents ?? 0));
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [payments]);

  const EXPORT_COLUMNS = ["Organização", "Método", "Status", "Bruto", "Taxa", "Líquido", "Libera em", "Liberado", "Criado em"];

  const exportRows = (): string[][] => {
    if (!payments) return [];
    return payments.map((p) => [
      p.organization_name, p.method, p.status,
      (p.amount_cents / 100).toFixed(2), ((p.fee_cents ?? 0) / 100).toFixed(2), ((p.net_cents ?? 0) / 100).toFixed(2),
      p.money_release_date ?? "", p.released ? "sim" : "não", p.created_at,
    ]);
  };

  const exportFilename = (ext: string) => `pagamentos-${new Date().toISOString().slice(0, 10)}.${ext}`;

  const exportCsv = () => {
    const rows = exportRows();
    if (rows.length === 0) return;
    const lines = [EXPORT_COLUMNS, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    downloadBlob(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }), exportFilename("csv"));
  };

  // SpreadsheetML (formato XML do Excel 2003) -- o Excel abre direto, sem
  // aviso de formato, sem precisar instalar biblioteca nova (xlsx/SheetJS
  // já teve vulnerabilidade de segurança real reportada em versões antigas).
  const exportXls = () => {
    const rows = exportRows();
    if (rows.length === 0) return;
    const escapeXml = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const cell = (v: string) => `<Cell><Data ss:Type="String">${escapeXml(v)}</Data></Cell>`;
    const row = (values: string[]) => `<Row>${values.map(cell).join("")}</Row>`;
    const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="Pagamentos"><Table>
${row(EXPORT_COLUMNS)}
${rows.map(row).join("\n")}
</Table></Worksheet>
</Workbook>`;
    downloadBlob(new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8" }), exportFilename("xls"));
  };

  const exportPdf = () => {
    const rows = exportRows();
    if (rows.length === 0) return;
    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const colWidths = [45, 18, 22, 22, 18, 22, 32, 18, 40];
    const colX: number[] = [];
    colWidths.reduce((x, w) => { colX.push(x); return x + w; }, margin);
    let y = margin;

    const drawHeaderRow = () => {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      EXPORT_COLUMNS.forEach((h, i) => pdf.text(h, colX[i], y));
      y += 5;
      pdf.setFont("helvetica", "normal");
    };

    pdf.setFontSize(13);
    pdf.text("Ponderum — Pagamentos", margin, y);
    y += 8;
    drawHeaderRow();

    for (const r of rows) {
      if (y + 5 > pageHeight - margin) { pdf.addPage(); y = margin; drawHeaderRow(); }
      r.forEach((v, i) => pdf.text(pdf.splitTextToSize(v, colWidths[i] - 2)[0] ?? "", colX[i], y));
      y += 5;
    }

    downloadBlob(new Blob([pdf.output("arraybuffer")], { type: "application/pdf" }), exportFilename("pdf"));
  };

  if (permsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canViewDev) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <p className="text-sm text-muted-foreground">Acesso restrito.</p>
        <button onClick={() => navigate("/")} className="text-xs text-primary underline">Voltar</button>
      </div>
    );
  }

  const cards = summary ? [
    { label: "Vendido (mês)", value: fmtBRL(summary.sold_cents_month / 100), icon: TrendingUp },
    { label: "Taxas (mês)", value: fmtBRL(summary.fee_cents_month / 100), icon: Percent },
    { label: "Líquido (mês)", value: fmtBRL(summary.net_cents_month / 100), icon: Wallet },
    { label: "A liberar", value: fmtBRL(summary.to_release_cents / 100), icon: Clock },
    { label: "Liberado", value: fmtBRL(summary.released_cents / 100), icon: CheckCircle2 },
    { label: "MRR", value: fmtBRL(summary.mrr_cents / 100), icon: TrendingUp },
    { label: "Assinantes ativos", value: String(summary.active_subscribers), icon: Users },
    { label: "Inadimplentes", value: String(summary.past_due_subscribers), icon: AlertTriangle },
    { label: "Churn (mês)", value: String(summary.churn_month), icon: UserMinus },
  ] : [];

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg md:text-2xl font-semibold tracking-tight">Financeiro</h1>
          <p className="text-xs text-muted-foreground mt-0.5 font-mono">Ponderum · Repasse e conciliação</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={!payments}>
              <Download className="h-3.5 w-3.5" /> Exportar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={exportCsv}>CSV</DropdownMenuItem>
            <DropdownMenuItem onClick={exportXls}>Excel (.xls)</DropdownMenuItem>
            <DropdownMenuItem onClick={exportPdf}>PDF</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {!summary ? (
        <div className="flex items-center justify-center min-h-[30vh]">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {cards.map(({ label, value, icon: Icon }) => (
            <SojCard key={label} className="flex flex-col gap-1 p-4">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Icon className="h-3.5 w-3.5" />
                <span className="text-[10px] font-mono uppercase tracking-wider">{label}</span>
              </div>
              <p className="text-xl font-semibold tabular-nums">{value}</p>
            </SojCard>
          ))}
        </div>
      )}

      <SojCard className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Repasse — cai em</h2>
        {toReleaseByDate.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Nada a liberar no momento.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {toReleaseByDate.map(([day, cents]) => (
              <li key={day} className="flex items-center justify-between py-2.5 text-sm">
                <span className="font-mono text-xs text-muted-foreground">
                  {new Date(`${day}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                </span>
                <span className="font-semibold tabular-nums">{fmtBRL(cents / 100)}</span>
              </li>
            ))}
          </ul>
        )}
      </SojCard>

      <ChargebacksCard />
    </div>
  );
}
