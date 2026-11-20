/**
 * The journal as an exportable table.
 *
 * The screens speak the active language; the exported document does not. Every
 * report export in this app is a French paper handed to an accountant, and the
 * PDF renderer only has Helvetica (WinAnsi) — Arabic would print as garbage. So
 * the columns, the type/method/status labels and the report title are French
 * here, exactly like `pages/reports/index.tsx` builds its own.
 *
 * What is exported is what the user is looking at: the rows of the active tab.
 * They are re-sorted by date, oldest first, because a register is read
 * chronologically and the PDF totals its pages in one pass.
 */

/** The four journal tabs — the export is labelled after the one in force. */
export type JournalFilter = "ALL" | "SALE" | "PURCHASE" | "EXPENSE";

/** What this module reads off a transaction (a subset of the API row). */
export interface ExportTransaction {
  date: string | Date;
  type: string;
  label: string;
  thirdParty?: string | null;
  amountHt: number;
  tvaAmount: number;
  amountTtc: number;
  paymentMethod: string;
  status: string;
  paid: number;
  rest: number;
}

export interface JournalExport {
  reportLabel: string;
  columns: string[];
  rows: (string | number)[][];
  /** Grand-total row; the PDF prints it once, on the last page. */
  summaryRow: (string | number)[];
  /** Date span the exported rows cover, e.g. `12/01/2026 – 28/02/2026`. */
  period: string;
}

const TYPE_LABEL: Record<string, string> = {
  SALE: "Vente",
  PURCHASE: "Achat",
  EXPENSE: "Charge",
};

const PAYMENT_LABEL: Record<string, string> = {
  CASH: "Espèces",
  BANK: "Banque",
  CREDIT: "Crédit",
};

const STATUS_LABEL: Record<string, string> = {
  PAID: "Payé",
  UNPAID: "Impayé",
  PARTIAL: "Partiel",
};

/**
 * The title printed above the table and used in the file name.
 *
 * `ALL` cannot be called "Factures": the journal also carries charges, which
 * are not invoices. Each tab is named for what it actually holds.
 */
const REPORT_LABEL: Record<JournalFilter, string> = {
  ALL: "Journal — Toutes les écritures",
  SALE: "Journal — Factures de vente",
  PURCHASE: "Journal — Factures d'achat",
  EXPENSE: "Journal — Charges",
};

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** The `YYYY-MM-DD` key of a row date, for sorting and for the period span. */
function isoDay(value: string | Date): string {
  if (value instanceof Date) {
    const month = String(value.getUTCMonth() + 1).padStart(2, "0");
    const date = String(value.getUTCDate()).padStart(2, "0");
    return `${value.getUTCFullYear()}-${month}-${date}`;
  }
  return String(value).slice(0, 10);
}

/** `2026-01-12` → `12/01/2026`; anything else is returned as-is. */
function day(iso: string): string {
  const match = ISO_DAY.exec(iso);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : iso;
}

export function buildJournalExport(
  transactions: readonly ExportTransaction[],
  filter: JournalFilter,
): JournalExport {
  const picked = transactions
    .filter((t) => filter === "ALL" || t.type === filter)
    .map((tx) => ({ tx, iso: isoDay(tx.date) }))
    .sort((a, b) => a.iso.localeCompare(b.iso));

  const data = picked.map(({ tx: t, iso }) => [
    day(iso),
    TYPE_LABEL[t.type] ?? t.type,
    t.label,
    t.thirdParty || "",
    t.amountHt,
    t.tvaAmount,
    t.amountTtc,
    PAYMENT_LABEL[t.paymentMethod] ?? t.paymentMethod,
    STATUS_LABEL[t.status] ?? t.status,
    t.paid,
    t.rest,
  ]);

  const total = (pick: (t: ExportTransaction) => number) =>
    picked.reduce((sum, { tx }) => sum + pick(tx), 0);

  const first = picked.length ? day(picked[0].iso) : "";
  const last = picked.length ? day(picked[picked.length - 1].iso) : "";
  const period = !picked.length
    ? "—"
    : first === last
      ? first
      : `${first} – ${last}`;

  return {
    reportLabel: REPORT_LABEL[filter],
    columns: [
      "Date",
      "Type",
      "Libellé",
      "Tiers",
      "Montant HT",
      "TVA",
      "Montant TTC",
      "Mode",
      "Statut",
      "Payé",
      "Reste à Payer",
    ],
    rows: data,
    summaryRow: [
      "",
      "TOTAUX",
      "",
      "",
      total((t) => t.amountHt),
      total((t) => t.tvaAmount),
      total((t) => t.amountTtc),
      "",
      "",
      total((t) => t.paid),
      total((t) => t.rest),
    ],
    period,
  };
}
