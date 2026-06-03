import { useMemo, useState } from "react";
import {
  useGetCompany,
  useListTransactions,
  useListInventoryItems,
  useListInventoryMovements,
  useListAssets,
  useListPayrolls,
  useListFunding,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { FileDown, FileSpreadsheet } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

const REPORT_TYPES = [
  { id: "caisse", label: "1 - Caisse (Livre de Caisse)" },
  { id: "banque", label: "2 - Banque (Livre de Banque)" },
  { id: "stocks", label: "3 - Stocks (Livre des Stocks)" },
  { id: "achats", label: "4 - Achats & Fournisseurs" },
  { id: "ventes", label: "5 - Ventes & Clients" },
  { id: "charges", label: "6 - Charges d'Exploitation" },
  { id: "equipements", label: "7 - Equipements & Amortissements" },
  { id: "bilan", label: "8 - Bilan & Compte de Résultat" },
] as const;
type ReportId = (typeof REPORT_TYPES)[number]["id"];

const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

// ─── Formatting ──────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString("fr-DZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " DA";
}

function fmtDate(d: string | Date): string {
  return String(d).slice(0, 10);
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function inRange(dateStr: string | Date, from: Date, to: Date): boolean {
  const d = new Date(String(dateStr).slice(0, 10) + "T00:00:00Z");
  return d >= from && d <= to;
}

function rangeEnd(year: number, month: number): Date {
  // Last day of the month at 23:59:59
  return new Date(Date.UTC(year, month, 0, 23, 59, 59));
}

function rangeStart(year: number, month: number): Date {
  return new Date(Date.UTC(year, month - 1, 1));
}

// ─── Report computation helpers ───────────────────────────────────────────────

type TxRow = {
  id: string;
  date: string | Date;
  type: string;
  label: string;
  amountHt: number;
  tvaRate: number;
  tvaAmount: number;
  amountTtc: number;
  paymentMethod: string;
  status: string;
  thirdParty?: string | null;
  category?: string | null;
};

type MvRow = {
  id: string;
  itemId: string;
  itemName?: string;
  date: string | Date;
  quantity: number;
  direction: string;
  unitCostHt: number;
  note?: string | null;
};

type AssetRow = {
  id: string;
  label: string;
  category?: string | null;
  costHt: number;
  purchaseDate: string | Date;
  lifeYears: number;
  residualValue: number;
  monthlyDepreciation: number;
  accumulatedDepreciation: number;
  bookValue: number;
};

function computeCaisseOrBanque(
  txns: TxRow[],
  from: Date,
  to: Date,
  method: "CASH" | "BANK",
) {
  const rows = txns
    .filter((t) => {
      if (method === "CASH") return t.paymentMethod === "CASH";
      return t.paymentMethod === "BANK" || t.paymentMethod === "CREDIT";
    })
    .filter((t) => inRange(t.date, from, to))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  let balance = 0;
  const data = rows.map((t, i) => {
    const enc = t.type === "SALE" ? t.amountTtc : 0;
    const dec = t.type !== "SALE" ? t.amountTtc : 0;
    balance += enc - dec;
    return {
      date: fmtDate(t.date),
      label: t.label,
      ref: `REF-${String(i + 1).padStart(3, "0")}`,
      enc,
      dec,
      solde: balance,
      obs: t.thirdParty || t.category || "",
    };
  });

  const totalEnc = data.reduce((s, r) => s + r.enc, 0);
  const totalDec = data.reduce((s, r) => s + r.dec, 0);
  return { data, totalEnc, totalDec, finalSolde: balance };
}

function computeStocks(mvs: MvRow[], from: Date, to: Date) {
  const filtered = mvs
    .filter((m) => inRange(m.date, from, to))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  let balance = 0;
  const data = filtered.map((m, i) => {
    const val = m.quantity * m.unitCostHt;
    const entree = m.direction === "IN" ? val : 0;
    const sortie = m.direction === "OUT" ? val : 0;
    balance += entree - sortie;
    return {
      date: fmtDate(m.date),
      label: m.itemName || m.itemId,
      ref: `STK-${String(i + 1).padStart(3, "0")}`,
      entree,
      sortie,
      solde: Math.max(0, balance),
      obs: m.note || "",
    };
  });

  const totalEntree = data.reduce((s, r) => s + r.entree, 0);
  const totalSortie = data.reduce((s, r) => s + r.sortie, 0);
  return { data, totalEntree, totalSortie, finalSolde: Math.max(0, balance) };
}

function computeAchatsOrVentes(
  txns: TxRow[],
  from: Date,
  to: Date,
  txType: "PURCHASE" | "SALE",
) {
  const rows = txns
    .filter((t) => t.type === txType)
    .filter((t) => inRange(t.date, from, to))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  const data = rows.map((t, i) => {
    const versements =
      t.status === "PAID" ? t.amountTtc : t.status === "PARTIAL" ? t.amountTtc * 0.5 : 0;
    return {
      date: fmtDate(t.date),
      label: t.label,
      ref: `${txType === "PURCHASE" ? "ACH" : "VNT"}-${String(i + 1).padStart(3, "0")}`,
      ht: t.amountHt,
      tva: t.tvaAmount,
      ttc: t.amountTtc,
      versements,
      reste: Math.max(0, t.amountTtc - versements),
      thirdParty: t.thirdParty || "",
    };
  });

  const totals = {
    ht: data.reduce((s, r) => s + r.ht, 0),
    tva: data.reduce((s, r) => s + r.tva, 0),
    ttc: data.reduce((s, r) => s + r.ttc, 0),
    versements: data.reduce((s, r) => s + r.versements, 0),
    reste: data.reduce((s, r) => s + r.reste, 0),
  };
  return { data, totals };
}

type PayrollRow = {
  id: string;
  employeeId: string;
  employeeName?: string;
  monthYear: string;
  grossSalary: number;
  cnasDeduction: number;
  irgDeduction: number;
  netToPay: number;
  generatedAt?: string | Date;
};

function computeCharges(
  txns: TxRow[],
  payrolls: PayrollRow[],
  assets: AssetRow[],
  from: Date,
  to: Date,
) {
  // EXPENSE transactions
  const expenses = txns
    .filter((t) => t.type === "EXPENSE")
    .filter((t) => inRange(t.date, from, to))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  // Payrolls in period
  const payrollRows = payrolls.filter((p) => {
    const [y, m] = p.monthYear.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1, 1));
    return d >= from && d <= rangeEnd(to.getUTCFullYear(), to.getUTCMonth() + 1);
  });

  // Monthly depreciation for assets (months in range)
  const monthsInRange: string[] = [];
  const cur = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1));
  while (cur <= end) {
    monthsInRange.push(`${cur.getUTCFullYear()}-${String(cur.getUTCMonth() + 1).padStart(2, "0")}`);
    cur.setUTCMonth(cur.getUTCMonth() + 1);
  }

  let idx = 1;
  const data: {
    date: string; label: string; ref: string;
    montant: number; paye: number; reste: number; obs: string;
  }[] = [];

  for (const t of expenses) {
    const paye = t.status === "PAID" ? t.amountTtc : t.status === "PARTIAL" ? t.amountTtc * 0.5 : 0;
    data.push({
      date: fmtDate(t.date),
      label: t.label,
      ref: `CHG-${String(idx++).padStart(3, "0")}`,
      montant: t.amountTtc,
      paye,
      reste: Math.max(0, t.amountTtc - paye),
      obs: t.category || t.thirdParty || "",
    });
  }

  for (const p of payrollRows) {
    data.push({
      date: p.monthYear + "-01",
      label: `Salaire - ${p.employeeName || p.employeeId} (${p.monthYear})`,
      ref: `PAY-${String(idx++).padStart(3, "0")}`,
      montant: p.netToPay,
      paye: p.netToPay,
      reste: 0,
      obs: `Brut: ${fmt(p.grossSalary)} | CNAS: ${fmt(p.cnasDeduction)} | IRG: ${fmt(p.irgDeduction)}`,
    });
  }

  for (const a of assets) {
    for (const my of monthsInRange) {
      const purchase = new Date(String(a.purchaseDate).slice(0, 10) + "T00:00:00Z");
      const assetMY = `${purchase.getUTCFullYear()}-${String(purchase.getUTCMonth() + 1).padStart(2, "0")}`;
      if (my < assetMY) continue;
      if (a.monthlyDepreciation <= 0) continue;
      data.push({
        date: my + "-01",
        label: `Amortissement - ${a.label}`,
        ref: `AMO-${String(idx++).padStart(3, "0")}`,
        montant: a.monthlyDepreciation,
        paye: a.monthlyDepreciation,
        reste: 0,
        obs: a.category || "",
      });
    }
  }

  data.sort((a, b) => a.date.localeCompare(b.date));

  const totals = {
    montant: data.reduce((s, r) => s + r.montant, 0),
    paye: data.reduce((s, r) => s + r.paye, 0),
    reste: data.reduce((s, r) => s + r.reste, 0),
  };
  return { data, totals };
}

function computeEquipements(assets: AssetRow[]) {
  return assets.map((a, i) => ({
    date: fmtDate(a.purchaseDate),
    label: a.label,
    ref: `IMM-${String(i + 1).padStart(3, "0")}`,
    montant: a.costHt,
    amortissement: a.accumulatedDepreciation,
    valeurNette: a.bookValue,
    obs: a.category || "",
  }));
}

type FundingEntry = {
  id: string;
  source: string;
  label?: string | null;
  amount: number;
  date: string | Date;
};

function computeBilan(
  txns: TxRow[],
  mvs: MvRow[],
  assets: AssetRow[],
  payrolls: PayrollRow[],
  funding: FundingEntry[],
  from: Date,
  to: Date,
) {
  const allTxns = txns.filter((t) => inRange(t.date, from, to));

  // Revenue / Expenses
  const sales = allTxns.filter((t) => t.type === "SALE");
  const purchases = allTxns.filter((t) => t.type === "PURCHASE");
  const expenses = allTxns.filter((t) => t.type === "EXPENSE");

  const totalSalesHt = sales.reduce((s, t) => s + t.amountHt, 0);
  const totalPurchasesHt = purchases.reduce((s, t) => s + t.amountHt, 0);
  const totalExpensesHt = expenses.reduce((s, t) => s + t.amountTtc, 0);

  const tvaCollectee = sales.reduce((s, t) => s + t.tvaAmount, 0);
  const tvaDeductible = [...purchases, ...expenses].reduce((s, t) => s + t.tvaAmount, 0);
  const tvaNette = tvaCollectee - tvaDeductible;

  // Payrolls in period
  const periodPayrolls = payrolls.filter((p) => {
    const [y, m] = p.monthYear.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1, 1));
    return d >= from && d <= rangeEnd(to.getUTCFullYear(), to.getUTCMonth() + 1);
  });
  const totalPayroll = periodPayrolls.reduce((s, p) => s + p.netToPay, 0);

  // Stock value variation
  const allMvs = mvs.filter((m) => inRange(m.date, from, to));
  const stockVariation =
    allMvs.filter((m) => m.direction === "IN").reduce((s, m) => s + m.quantity * m.unitCostHt, 0) -
    allMvs.filter((m) => m.direction === "OUT").reduce((s, m) => s + m.quantity * m.unitCostHt, 0);

  // All-time stock value (for balance sheet)
  const allTimeStockValue = Math.max(
    0,
    mvs.reduce((s, m) => {
      const v = m.quantity * m.unitCostHt;
      return m.direction === "IN" ? s + v : s - v;
    }, 0),
  );

  // Total assets book value
  const totalAssetsValue = assets.reduce((s, a) => s + a.bookValue, 0);
  const totalDepreciation = assets.reduce((s, a) => s + a.accumulatedDepreciation, 0);

  // Cash position
  const cashTxns = txns.filter((t) => t.paymentMethod === "CASH" && t.status === "PAID");
  const caisse =
    cashTxns.filter((t) => t.type === "SALE").reduce((s, t) => s + t.amountTtc, 0) -
    cashTxns.filter((t) => t.type !== "SALE").reduce((s, t) => s + t.amountTtc, 0);

  const bankTxns = txns.filter(
    (t) => (t.paymentMethod === "BANK" || t.paymentMethod === "CREDIT") && t.status === "PAID",
  );
  const banque =
    bankTxns.filter((t) => t.type === "SALE").reduce((s, t) => s + t.amountTtc, 0) -
    bankTxns.filter((t) => t.type !== "SALE").reduce((s, t) => s + t.amountTtc, 0);

  // Receivables (unpaid sales)
  const creancesClient = sales
    .filter((t) => t.status !== "PAID")
    .reduce((s, t) => s + (t.status === "PARTIAL" ? t.amountTtc * 0.5 : t.amountTtc), 0);

  // Payables (unpaid purchases + expenses)
  const dettesExploitation = [...purchases, ...expenses]
    .filter((t) => t.status !== "PAID")
    .reduce((s, t) => s + (t.status === "PARTIAL" ? t.amountTtc * 0.5 : t.amountTtc), 0);

  // Capital / Loans
  const capitalSocial = funding
    .filter((f) => f.source.toLowerCase().includes("capital") || f.source === "EQUITY")
    .reduce((s, f) => s + f.amount, 0);
  const emprunts = funding
    .filter((f) => !f.source.toLowerCase().includes("capital") && f.source !== "EQUITY")
    .reduce((s, f) => s + f.amount, 0);

  // All funding
  const totalFunding = funding.reduce((s, f) => s + f.amount, 0);

  // Additional income
  const autresRecettes = 0;

  const totalRecettes = totalSalesHt + autresRecettes + stockVariation;
  const totalDepenses = totalPurchasesHt + totalExpensesHt + totalPayroll + totalDepreciation;
  const resultat = totalRecettes - totalDepenses;

  const totalActif = totalAssetsValue + allTimeStockValue + creancesClient + Math.max(0, caisse) + Math.max(0, banque);
  const totalPassif = totalFunding + resultat + (tvaNette > 0 ? tvaNette : 0) + dettesExploitation;

  return {
    compteResultat: {
      recettesVentes: totalSalesHt,
      autresRecettes,
      variationStocks: stockVariation,
      totalRecettes,
      depensesAchats: totalPurchasesHt,
      autresDepenses: totalExpensesHt + totalPayroll + totalDepreciation,
      totalDepenses,
      resultat,
    },
    bilan: {
      actif: {
        immobilisations: totalAssetsValue,
        stocks: allTimeStockValue,
        creances: creancesClient,
        caisse: Math.max(0, caisse),
        banque: Math.max(0, banque),
        total: totalActif,
      },
      passif: {
        capital: capitalSocial || totalFunding,
        resultat,
        emprunts,
        dettes: dettesExploitation,
        tvaNette: Math.max(0, tvaNette),
        total: totalPassif,
      },
    },
    balanced: Math.abs(totalActif - totalPassif) < 1,
  };
}

// ─── Export helpers ──────────────────────────────────────────────────────────

async function exportPDF(
  reportLabel: string,
  columns: string[],
  rows: (string | number)[][],
  summaryRow: (string | number)[] | null,
  companyName: string,
  period: string,
  isLandscape = false,
) {
  const jsPDF = (await import("jspdf")).default;
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: isLandscape ? "landscape" : "portrait" });
  const pageW = doc.internal.pageSize.getWidth();
  const today = new Date().toLocaleDateString("fr-DZ");

  // Header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(companyName.toUpperCase(), pageW / 2, 18, { align: "center" });
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(reportLabel, pageW / 2, 26, { align: "center" });
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Période : ${period}     |     Généré le : ${today}`, pageW / 2, 33, { align: "center" });
  doc.setTextColor(0);
  doc.line(14, 36, pageW - 14, 36);

  const bodyRows = rows.map((r) =>
    r.map((v) => (typeof v === "number" ? fmt(v) : v)),
  );
  const footRows = summaryRow
    ? [summaryRow.map((v) => (typeof v === "number" ? fmt(v) : v))]
    : [];

  autoTable(doc, {
    startY: 40,
    head: [columns],
    body: bodyRows,
    foot: footRows,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [26, 75, 71], textColor: 255, fontStyle: "bold" },
    footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  doc.save(`${reportLabel.replace(/\s+/g, "_")}_${period}.pdf`);
}

async function exportExcel(
  reportLabel: string,
  columns: string[],
  rows: (string | number)[][],
  summaryRow: (string | number)[] | null,
  period: string,
) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  const wsData: (string | number)[][] = [columns, ...rows];
  if (summaryRow) wsData.push(summaryRow);
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Bold header
  const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = ws[XLSX.utils.encode_cell({ r: 0, c })];
    if (cell) cell.s = { font: { bold: true } };
  }
  // Bold summary row
  if (summaryRow) {
    const lastRow = wsData.length - 1;
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r: lastRow, c })];
      if (cell) cell.s = { font: { bold: true } };
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, reportLabel.slice(0, 31));
  XLSX.writeFile(wb, `${reportLabel.replace(/\s+/g, "_")}_${period}.xlsx`);
}

// ─── Main Component ──────────────────────────────────────────────────────────

const now = new Date();
const DEFAULT_YEAR = now.getFullYear();
const DEFAULT_FROM_MONTH = 1;
const DEFAULT_TO_MONTH = now.getMonth() + 1;

export default function Reports() {
  const [reportId, setReportId] = useState<ReportId>("caisse");
  const [fromYear, setFromYear] = useState(DEFAULT_YEAR);
  const [fromMonth, setFromMonth] = useState(DEFAULT_FROM_MONTH);
  const [toYear, setToYear] = useState(DEFAULT_YEAR);
  const [toMonth, setToMonth] = useState(DEFAULT_TO_MONTH);

  const { data: company } = useGetCompany();
  const { data: txns = [], isLoading: loadingTxns } = useListTransactions();
  const { data: mvs = [], isLoading: loadingMvs } = useListInventoryMovements();
  const { data: items = [] } = useListInventoryItems();
  const { data: assets = [], isLoading: loadingAssets } = useListAssets();
  const { data: payrolls = [], isLoading: loadingPayrolls } = useListPayrolls();
  const { data: funding = [] } = useListFunding();

  const isLoading = loadingTxns || loadingMvs || loadingAssets || loadingPayrolls;

  const nameById = useMemo(
    () => new Map(items.map((i) => [i.id, i.name])),
    [items],
  );
  const mvsWithNames: MvRow[] = useMemo(
    () => mvs.map((m) => ({ ...m, itemName: nameById.get(m.itemId) || m.itemId })),
    [mvs, nameById],
  );

  const from = rangeStart(fromYear, fromMonth);
  const to = rangeEnd(toYear, toMonth);
  const period = `${MONTHS[fromMonth - 1]} ${fromYear} – ${MONTHS[toMonth - 1]} ${toYear}`;
  const companyName = company?.name || "DJERDJERA";

  const years = Array.from({ length: 8 }, (_, i) => DEFAULT_YEAR - 3 + i);

  const reportLabel = REPORT_TYPES.find((r) => r.id === reportId)?.label || "";

  // ── Computed reports ──
  const caisse = useMemo(() => computeCaisseOrBanque(txns as TxRow[], from, to, "CASH"), [txns, from, to]);
  const banque = useMemo(() => computeCaisseOrBanque(txns as TxRow[], from, to, "BANK"), [txns, from, to]);
  const stocks = useMemo(() => computeStocks(mvsWithNames, from, to), [mvsWithNames, from, to]);
  const achats = useMemo(() => computeAchatsOrVentes(txns as TxRow[], from, to, "PURCHASE"), [txns, from, to]);
  const ventes = useMemo(() => computeAchatsOrVentes(txns as TxRow[], from, to, "SALE"), [txns, from, to]);
  const charges = useMemo(
    () => computeCharges(txns as TxRow[], payrolls as PayrollRow[], assets as AssetRow[], from, to),
    [txns, payrolls, assets, from, to],
  );
  const equipements = useMemo(() => computeEquipements(assets as AssetRow[]), [assets]);
  const bilan = useMemo(
    () => computeBilan(txns as TxRow[], mvsWithNames, assets as AssetRow[], payrolls as PayrollRow[], funding as FundingEntry[], from, to),
    [txns, mvsWithNames, assets, payrolls, funding, from, to],
  );

  // ── Export helpers ──
  async function handlePDF() {
    const wide = ["achats", "ventes"].includes(reportId);
    const { cols, rows, summary } = getTableData();
    if (!cols) return;
    await exportPDF(reportLabel, cols, rows, summary, companyName, period, wide);
  }

  async function handleExcel() {
    const { cols, rows, summary } = getTableData();
    if (!cols) return;
    await exportExcel(reportLabel, cols, rows, summary, period);
  }

  function getTableData(): {
    cols: string[] | null;
    rows: (string | number)[][];
    summary: (string | number)[] | null;
  } {
    switch (reportId) {
      case "caisse":
      case "banque": {
        const d = reportId === "caisse" ? caisse : banque;
        return {
          cols: ["Date", "Libellé", "Référence", "Encaissement (+)", "Décaissement (-)", "Solde", "Observation"],
          rows: d.data.map((r) => [r.date, r.label, r.ref, r.enc || "", r.dec || "", r.solde, r.obs]),
          summary: ["", "TOTAUX", "", d.totalEnc, d.totalDec, d.finalSolde, ""],
        };
      }
      case "stocks": {
        return {
          cols: ["Date", "Libellé", "Référence", "Entrée (+)", "Sortie (-)", "Solde", "Observation"],
          rows: stocks.data.map((r) => [r.date, r.label, r.ref, r.entree || "", r.sortie || "", r.solde, r.obs]),
          summary: ["", "TOTAUX", "", stocks.totalEntree, stocks.totalSortie, stocks.finalSolde, ""],
        };
      }
      case "achats":
      case "ventes": {
        const d = reportId === "achats" ? achats : ventes;
        const tva = reportId === "achats" ? "TVA Déductible (19%)" : "TVA Collectée (19%)";
        return {
          cols: ["Date", "Libellé", "Tiers", "Référence", "Montant HT", tva, "Montant TTC", "Versements", "Reste à Payer"],
          rows: d.data.map((r) => [r.date, r.label, r.thirdParty, r.ref, r.ht, r.tva, r.ttc, r.versements, r.reste]),
          summary: ["", "TOTAUX", "", "", d.totals.ht, d.totals.tva, d.totals.ttc, d.totals.versements, d.totals.reste],
        };
      }
      case "charges": {
        return {
          cols: ["Date", "Libellé", "Référence", "Montant", "Payé", "Reste à Payer", "Observation"],
          rows: charges.data.map((r) => [r.date, r.label, r.ref, r.montant, r.paye, r.reste, r.obs]),
          summary: ["", "TOTAUX", "", charges.totals.montant, charges.totals.paye, charges.totals.reste, ""],
        };
      }
      case "equipements": {
        return {
          cols: ["Date Achat", "Libellé", "Référence", "Valeur d'Origine", "Amortissement Cumulé", "Valeur Nette", "Catégorie"],
          rows: equipements.map((r) => [r.date, r.label, r.ref, r.montant, r.amortissement, r.valeurNette, r.obs]),
          summary: [
            "", "TOTAUX", "",
            equipements.reduce((s, r) => s + r.montant, 0),
            equipements.reduce((s, r) => s + r.amortissement, 0),
            equipements.reduce((s, r) => s + r.valeurNette, 0),
            "",
          ],
        };
      }
      default:
        return { cols: null, rows: [], summary: null };
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Rapports Comptables</h1>
        <p className="text-muted-foreground mt-1">
          Livres comptables standardisés — Comptabilité Financière Simplifiée (SCF Algérie)
        </p>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[220px]">
              <p className="text-xs text-muted-foreground mb-1.5 font-medium">Type de rapport</p>
              <Select value={reportId} onValueChange={(v) => setReportId(v as ReportId)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1.5 font-medium">De</p>
              <div className="flex gap-2">
                <Select value={String(fromMonth)} onValueChange={(v) => setFromMonth(Number(v))}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={String(fromYear)} onValueChange={(v) => setFromYear(Number(v))}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1.5 font-medium">À</p>
              <div className="flex gap-2">
                <Select value={String(toMonth)} onValueChange={(v) => setToMonth(Number(v))}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={String(toYear)} onValueChange={(v) => setToYear(Number(v))}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={handleExcel} className="gap-2">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                Excel
              </Button>
              <Button variant="outline" onClick={handlePDF} className="gap-2">
                <FileDown className="h-4 w-4 text-rose-600" />
                PDF
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Période sélectionnée : <span className="font-semibold text-foreground">{period}</span>
          </p>
        </CardContent>
      </Card>

      {/* Report Content */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : (
        <ReportView
          reportId={reportId}
          caisse={caisse}
          banque={banque}
          stocks={stocks}
          achats={achats}
          ventes={ventes}
          charges={charges}
          equipements={equipements}
          bilan={bilan}
          period={period}
          companyName={companyName}
        />
      )}
    </div>
  );
}

// ─── Report View dispatcher ───────────────────────────────────────────────────

function ReportView({
  reportId, caisse, banque, stocks, achats, ventes, charges, equipements, bilan, period, companyName,
}: {
  reportId: ReportId;
  caisse: ReturnType<typeof computeCaisseOrBanque>;
  banque: ReturnType<typeof computeCaisseOrBanque>;
  stocks: ReturnType<typeof computeStocks>;
  achats: ReturnType<typeof computeAchatsOrVentes>;
  ventes: ReturnType<typeof computeAchatsOrVentes>;
  charges: ReturnType<typeof computeCharges>;
  equipements: ReturnType<typeof computeEquipements>;
  bilan: ReturnType<typeof computeBilan>;
  period: string;
  companyName: string;
}) {
  switch (reportId) {
    case "caisse":
      return <CaisseTable data={caisse} title="Livre de Caisse" period={period} companyName={companyName} />;
    case "banque":
      return <CaisseTable data={banque} title="Livre de Banque" period={period} companyName={companyName} />;
    case "stocks":
      return <StocksTable data={stocks} period={period} companyName={companyName} />;
    case "achats":
      return <AchatsVentesTable data={achats} type="achats" period={period} companyName={companyName} />;
    case "ventes":
      return <AchatsVentesTable data={ventes} type="ventes" period={period} companyName={companyName} />;
    case "charges":
      return <ChargesTable data={charges} period={period} companyName={companyName} />;
    case "equipements":
      return <EquipementsTable data={equipements} period={period} companyName={companyName} />;
    case "bilan":
      return <BilanView data={bilan} period={period} companyName={companyName} />;
  }
}

// ─── Shared table primitives ─────────────────────────────────────────────────

function THead({ cols }: { cols: string[] }) {
  return (
    <thead>
      <tr className="border-b bg-[hsl(var(--primary))/0.08]">
        {cols.map((c, i) => (
          <th key={i} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">
            {c}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function TFoot({ cols }: { cols: (string | number)[] }) {
  return (
    <tfoot>
      <tr className="border-t-2 bg-muted/40">
        {cols.map((c, i) => (
          <td key={i} className={`px-3 py-2.5 text-xs font-bold ${typeof c === "number" ? "text-right tabular-nums" : ""}`}>
            {typeof c === "number" ? fmt(c) : c}
          </td>
        ))}
      </tr>
    </tfoot>
  );
}

function MoneyCell({ v }: { v: number }) {
  return (
    <td className={`px-3 py-2 text-xs text-right tabular-nums ${v < 0 ? "text-destructive" : v > 0 ? "" : "text-muted-foreground"}`}>
      {v === 0 ? "–" : fmt(v)}
    </td>
  );
}

function ReportCard({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <Card>
      {title && (
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className={title ? "" : "pt-4"}>
        <div className="overflow-x-auto rounded-md border">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12 text-muted-foreground text-sm">
      Aucune donnée pour la période sélectionnée.
    </div>
  );
}

// ─── Report 1 & 2: Caisse / Banque ──────────────────────────────────────────

function CaisseTable({
  data, title,
}: {
  data: ReturnType<typeof computeCaisseOrBanque>;
  title: string;
  period: string;
  companyName: string;
}) {
  if (data.data.length === 0) return <Card><CardContent className="pt-6"><EmptyState /></CardContent></Card>;
  return (
    <ReportCard title={title}>
      <table className="w-full text-sm">
        <THead cols={["Date", "Libellé", "Référence", "Encaissement (+)", "Décaissement (-)", "Solde", "Observation"]} />
        <tbody>
          {data.data.map((r, i) => (
            <tr key={i} className="border-b hover:bg-muted/30 transition-colors even:bg-muted/10">
              <td className="px-3 py-2 text-xs whitespace-nowrap">{r.date}</td>
              <td className="px-3 py-2 text-xs">{r.label}</td>
              <td className="px-3 py-2 text-xs text-muted-foreground">{r.ref}</td>
              <MoneyCell v={r.enc} />
              <MoneyCell v={r.dec} />
              <td className={`px-3 py-2 text-xs text-right tabular-nums font-medium ${r.solde < 0 ? "text-destructive" : "text-primary"}`}>
                {fmt(r.solde)}
              </td>
              <td className="px-3 py-2 text-xs text-muted-foreground">{r.obs}</td>
            </tr>
          ))}
        </tbody>
        <TFoot cols={["", "TOTAUX", "", data.totalEnc, data.totalDec, data.finalSolde, ""]} />
      </table>
    </ReportCard>
  );
}

// ─── Report 3: Stocks ────────────────────────────────────────────────────────

function StocksTable({
  data,
}: {
  data: ReturnType<typeof computeStocks>;
  period: string;
  companyName: string;
}) {
  if (data.data.length === 0) return <Card><CardContent className="pt-6"><EmptyState /></CardContent></Card>;
  return (
    <ReportCard title="Livre des Stocks">
      <table className="w-full text-sm">
        <THead cols={["Date", "Article", "Référence", "Entrée (+)", "Sortie (-)", "Solde Valeur", "Note"]} />
        <tbody>
          {data.data.map((r, i) => (
            <tr key={i} className="border-b hover:bg-muted/30 transition-colors even:bg-muted/10">
              <td className="px-3 py-2 text-xs whitespace-nowrap">{r.date}</td>
              <td className="px-3 py-2 text-xs font-medium">{r.label}</td>
              <td className="px-3 py-2 text-xs text-muted-foreground">{r.ref}</td>
              <MoneyCell v={r.entree} />
              <MoneyCell v={r.sortie} />
              <td className="px-3 py-2 text-xs text-right tabular-nums font-medium text-primary">
                {fmt(r.solde)}
              </td>
              <td className="px-3 py-2 text-xs text-muted-foreground">{r.obs}</td>
            </tr>
          ))}
        </tbody>
        <TFoot cols={["", "TOTAUX", "", data.totalEntree, data.totalSortie, data.finalSolde, ""]} />
      </table>
    </ReportCard>
  );
}

// ─── Report 4 & 5: Achats / Ventes ───────────────────────────────────────────

function AchatsVentesTable({
  data, type,
}: {
  data: ReturnType<typeof computeAchatsOrVentes>;
  type: "achats" | "ventes";
  period: string;
  companyName: string;
}) {
  const isAchats = type === "achats";
  const title = isAchats ? "Livre des Achats & Fournisseurs" : "Livre des Ventes & Clients";
  const tvaLabel = isAchats ? "TVA Déductible (19%)" : "TVA Collectée (19%)";

  if (data.data.length === 0) return <Card><CardContent className="pt-6"><EmptyState /></CardContent></Card>;
  return (
    <ReportCard title={title}>
      <table className="w-full text-sm">
        <THead cols={["Date", "Libellé", "Tiers", "Référence", "Montant HT", tvaLabel, "Montant TTC", "Versements", "Reste à Payer"]} />
        <tbody>
          {data.data.map((r, i) => (
            <tr key={i} className="border-b hover:bg-muted/30 transition-colors even:bg-muted/10">
              <td className="px-3 py-2 text-xs whitespace-nowrap">{r.date}</td>
              <td className="px-3 py-2 text-xs">{r.label}</td>
              <td className="px-3 py-2 text-xs text-muted-foreground">{r.thirdParty}</td>
              <td className="px-3 py-2 text-xs text-muted-foreground">{r.ref}</td>
              <MoneyCell v={r.ht} />
              <MoneyCell v={r.tva} />
              <MoneyCell v={r.ttc} />
              <MoneyCell v={r.versements} />
              <td className={`px-3 py-2 text-xs text-right tabular-nums ${r.reste > 0 ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                {r.reste > 0 ? fmt(r.reste) : "–"}
              </td>
            </tr>
          ))}
        </tbody>
        <TFoot cols={["", "TOTAUX", "", "", data.totals.ht, data.totals.tva, data.totals.ttc, data.totals.versements, data.totals.reste]} />
      </table>
    </ReportCard>
  );
}

// ─── Report 6: Charges ───────────────────────────────────────────────────────

function ChargesTable({
  data,
}: {
  data: ReturnType<typeof computeCharges>;
  period: string;
  companyName: string;
}) {
  if (data.data.length === 0) return <Card><CardContent className="pt-6"><EmptyState /></CardContent></Card>;
  return (
    <ReportCard title="Livre des Charges d'Exploitation">
      <table className="w-full text-sm">
        <THead cols={["Date", "Libellé", "Référence", "Montant", "Payé", "Reste à Payer", "Observation"]} />
        <tbody>
          {data.data.map((r, i) => (
            <tr key={i} className="border-b hover:bg-muted/30 transition-colors even:bg-muted/10">
              <td className="px-3 py-2 text-xs whitespace-nowrap">{r.date}</td>
              <td className="px-3 py-2 text-xs">{r.label}</td>
              <td className="px-3 py-2 text-xs text-muted-foreground">{r.ref}</td>
              <MoneyCell v={r.montant} />
              <MoneyCell v={r.paye} />
              <td className={`px-3 py-2 text-xs text-right tabular-nums ${r.reste > 0 ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                {r.reste > 0 ? fmt(r.reste) : "–"}
              </td>
              <td className="px-3 py-2 text-xs text-muted-foreground max-w-xs truncate">{r.obs}</td>
            </tr>
          ))}
        </tbody>
        <TFoot cols={["", "TOTAUX", "", data.totals.montant, data.totals.paye, data.totals.reste, ""]} />
      </table>
    </ReportCard>
  );
}

// ─── Report 7: Equipements ───────────────────────────────────────────────────

function EquipementsTable({
  data,
}: {
  data: ReturnType<typeof computeEquipements>;
  period: string;
  companyName: string;
}) {
  if (data.length === 0) return <Card><CardContent className="pt-6"><EmptyState /></CardContent></Card>;
  const totalMontant = data.reduce((s, r) => s + r.montant, 0);
  const totalAmo = data.reduce((s, r) => s + r.amortissement, 0);
  const totalNet = data.reduce((s, r) => s + r.valeurNette, 0);
  return (
    <ReportCard title="Tableau des Equipements & Amortissements">
      <table className="w-full text-sm">
        <THead cols={["Date Achat", "Libellé", "Référence", "Valeur d'Origine", "Amortissement Cumulé", "Valeur Nette", "Catégorie"]} />
        <tbody>
          {data.map((r, i) => (
            <tr key={i} className="border-b hover:bg-muted/30 transition-colors even:bg-muted/10">
              <td className="px-3 py-2 text-xs whitespace-nowrap">{r.date}</td>
              <td className="px-3 py-2 text-xs font-medium">{r.label}</td>
              <td className="px-3 py-2 text-xs text-muted-foreground">{r.ref}</td>
              <MoneyCell v={r.montant} />
              <td className="px-3 py-2 text-xs text-right tabular-nums text-orange-600">{fmt(r.amortissement)}</td>
              <td className="px-3 py-2 text-xs text-right tabular-nums font-semibold text-primary">{fmt(r.valeurNette)}</td>
              <td className="px-3 py-2 text-xs text-muted-foreground">{r.obs}</td>
            </tr>
          ))}
        </tbody>
        <TFoot cols={["", "TOTAUX", "", totalMontant, totalAmo, totalNet, ""]} />
      </table>
    </ReportCard>
  );
}

// ─── Report 8: Bilan / Compte de Résultat ────────────────────────────────────

function BilanView({
  data, period, companyName,
}: {
  data: ReturnType<typeof computeBilan>;
  period: string;
  companyName: string;
}) {
  const { compteResultat: cr, bilan, balanced } = data;

  return (
    <div className="space-y-6">
      {/* Income Statement */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Compte de Résultat — {period}</CardTitle>
          <p className="text-xs text-muted-foreground">{companyName}</p>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm max-w-xl">
            <thead>
              <tr className="border-b">
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Désignation</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">Montant (DA)</th>
              </tr>
            </thead>
            <tbody>
              <CrRow label="1. Recettes sur Ventes" value={cr.recettesVentes} />
              <CrRow label="2. Autres Recettes et Prestations" value={cr.autresRecettes} />
              <CrRow label="3. Variation de Stocks (+/-)" value={cr.variationStocks} />
              <CrRow label="Total Produits (1)" value={cr.totalRecettes} bold />
              <tr><td colSpan={2} className="py-2" /></tr>
              <CrRow label="4. Dépenses sur Achats" value={cr.depensesAchats} />
              <CrRow label="5. Autres Charges (Charges, Paie, Amort.)" value={cr.autresDepenses} />
              <CrRow label="Total Charges (2)" value={cr.totalDepenses} bold />
              <tr><td colSpan={2} className="py-2" /></tr>
              <tr className="border-t-2 bg-primary/5">
                <td className="px-3 py-3 text-sm font-bold">
                  Résultat de l'Exercice (1) - (2)
                </td>
                <td className={`px-3 py-3 text-sm font-bold text-right tabular-nums ${cr.resultat >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                  {fmt(cr.resultat)}
                  <span className="ml-2 text-xs font-normal">
                    {cr.resultat >= 0 ? "(Bénéfice)" : "(Perte)"}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Balance Sheet */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Bilan Simplifié (Situation Financière)</CardTitle>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${balanced ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"}`}>
              {balanced ? "Bilan équilibré" : "Bilan à vérifier"}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Actif */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 px-3 py-1 bg-blue-50 rounded">
                ACTIF
              </h4>
              <table className="w-full text-sm">
                <tbody>
                  <BilanRow label="Immobilisations (Valeur Nette)" value={bilan.actif.immobilisations} />
                  <BilanRow label="Stocks" value={bilan.actif.stocks} />
                  <BilanRow label="Créances de l'Exploitation (Clients)" value={bilan.actif.creances} />
                  <BilanRow label="Caisse" value={bilan.actif.caisse} />
                  <BilanRow label="Banque" value={bilan.actif.banque} />
                </tbody>
                <tfoot>
                  <tr className="border-t-2 bg-blue-50/50">
                    <td className="px-3 py-2.5 text-sm font-bold">TOTAL ACTIF</td>
                    <td className="px-3 py-2.5 text-sm font-bold text-right tabular-nums text-blue-700">{fmt(bilan.actif.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Passif */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 px-3 py-1 bg-orange-50 rounded">
                PASSIF
              </h4>
              <table className="w-full text-sm">
                <tbody>
                  <BilanRow label="Capital" value={bilan.passif.capital} />
                  <BilanRow label="Résultat de l'Exercice" value={bilan.passif.resultat} highlight={bilan.passif.resultat >= 0 ? "positive" : "negative"} />
                  <BilanRow label="Emprunts" value={bilan.passif.emprunts} />
                  <BilanRow label="Dettes de l'Exploitation (Fournisseurs)" value={bilan.passif.dettes} />
                  <BilanRow label="TVA à Décaisser" value={bilan.passif.tvaNette} />
                </tbody>
                <tfoot>
                  <tr className="border-t-2 bg-orange-50/50">
                    <td className="px-3 py-2.5 text-sm font-bold">TOTAL PASSIF</td>
                    <td className="px-3 py-2.5 text-sm font-bold text-right tabular-nums text-orange-700">{fmt(bilan.passif.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {!balanced && (
            <p className="mt-4 text-xs text-orange-600 bg-orange-50 rounded p-3">
              Ecart de {fmt(Math.abs(bilan.actif.total - bilan.passif.total))} — Le bilan simplifié SCF est calculé à partir des données disponibles.
              Des écritures de régularisation ou une comptabilité en partie double complète sont nécessaires pour un équilibre parfait.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CrRow({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <tr className={`border-b ${bold ? "bg-muted/20" : ""}`}>
      <td className={`px-3 py-2 text-sm ${bold ? "font-semibold" : ""}`}>{label}</td>
      <td className={`px-3 py-2 text-sm text-right tabular-nums ${bold ? "font-semibold" : ""} ${value < 0 ? "text-destructive" : ""}`}>
        {fmt(value)}
      </td>
    </tr>
  );
}

function BilanRow({ label, value, highlight }: { label: string; value: number; highlight?: "positive" | "negative" }) {
  return (
    <tr className="border-b hover:bg-muted/20">
      <td className="px-3 py-2 text-sm">{label}</td>
      <td className={`px-3 py-2 text-sm text-right tabular-nums ${
        highlight === "positive" ? "text-emerald-600 font-semibold" :
        highlight === "negative" ? "text-destructive font-semibold" : ""
      }`}>
        {fmt(value)}
      </td>
    </tr>
  );
}
