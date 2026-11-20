/**
 * Ledger primitives and the shapes of the rows the API hands back.
 *
 * These lived in `pages/reports/lib/calculations.ts` until a second consumer
 * appeared. They are not report logic — they are what every screen that reads
 * the books needs in order to name a figure, compare a date, or walk a period —
 * so they belong somewhere both the reports and the analysis can reach without
 * one page importing another's private lib.
 *
 * What is left in `calculations.ts` is the ten `compute*` aggregations, which
 * really are report-specific.
 */
import { compactMoney } from "./money";

/**
 * Money, as the reports are written: compact at the thousand/million boundary
 * and suffixed `DA` — `12,35 M DA`, `1,23 K DA`, `850,00 DA`.
 *
 * The scaling itself lives in `lib/money.ts` (see there for the tooltip/export
 * split). This stays the reports' entry point because `calculations.ts` and the
 * report tables were written against it, and because the PDF export needs the
 * *exact* twin (`exactMoney`) rather than this one.
 */
export function fmt(n: number): string {
  return compactMoney(n);
}

/**
 * `"YYYY-MM-DD"` from either a wire string or a `Date`.
 *
 * `String(d).slice(0, 10)` is safe **only** because of where this is called: the
 * client receives `format: date` fields as plain strings, never as `Date`s (see
 * `lib/api-zod` vs `lib/api-client-react` — `useDates` revives `date-time` only,
 * and `customFetch` revives nothing). Handed a real `Date` this returns
 * `"Mon Jun 01"`. It is the same call that silently emptied every row in a
 * `scripts/` probe reading raw `pg`, where dates genuinely are `Date` objects —
 * if you are copying this into a script, format with local getters instead.
 */
export function fmtDate(d: string | Date): string {
  return String(d).slice(0, 10);
}

/** Inclusive on both ends, and both ends are compared in UTC. */
export function inRange(dateStr: string | Date, from: Date, to: Date): boolean {
  const d = new Date(String(dateStr).slice(0, 10) + "T00:00:00Z");
  return d >= from && d <= to;
}

/** Last instant of the month, built in UTC so the local clock cannot shift it. */
export function rangeEnd(year: number, month: number): Date {
  return new Date(Date.UTC(year, month, 0, 23, 59, 59));
}

/** First instant of the month, built in UTC. Pairs with `rangeEnd`. */
export function rangeStart(year: number, month: number): Date {
  return new Date(Date.UTC(year, month - 1, 1));
}

/** The `YYYY-MM` key of every month touched by [from, to], oldest first. */
export function monthsInRange(from: Date, to: Date): string[] {
  const months: string[] = [];
  const cur = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1));
  while (cur <= end) {
    months.push(
      `${cur.getUTCFullYear()}-${String(cur.getUTCMonth() + 1).padStart(2, "0")}`,
    );
    cur.setUTCMonth(cur.getUTCMonth() + 1);
  }
  return months;
}

export type TxRow = {
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
  /** The article this entry moved, when it moved one. */
  itemId?: string | null;
  quantity?: number | null;
  /** The CUMP applied, frozen when the entry was posted. */
  unitCostHt?: number | null;
  /** `quantity × unitCostHt`, frozen at posting. Only a sale carries one. */
  costOfGoodsSold?: number | null;
  /**
   * What has actually been settled against this entry, derived by the API from
   * its payment rows. This is the figure to read — `status` is a stored summary
   * that lags behind it.
   */
  paid: number;
  /** `amountTtc - paid`, never negative. */
  rest: number;
};

/**
 * One settlement, dated the day it was paid.
 *
 * `synthetic` marks the stand-in row the API reports for a facture that was
 * already PAID before payments were tracked; it has no payment row behind it.
 */
export type SettlementRow = {
  id: string;
  transactionId: string;
  date: string | Date;
  payer: string;
  amount: number;
  type: string;
  /** Free-text note carried on a recorded payment. */
  reference?: string | null;
  label?: string | null;
  transactionType: string;
  transactionLabel: string;
  synthetic: boolean;
};

export type MvRow = {
  id: string;
  itemId: string;
  itemName?: string;
  date: string | Date;
  quantity: number;
  direction: string;
  unitCostHt: number;
  note?: string | null;
  /** Set when a journal entry generated this movement rather than a hand entry. */
  transactionId?: string | null;
};

export type AssetRow = {
  id: string;
  label: string;
  category?: string | null;
  costHt: number;
  purchaseDate: string | Date;
  lifeYears: number;
  residualValue: number;
  /** Account the acquisition was paid from. Defaults to CASH when absent. */
  paymentAccount?: string | null;
  monthlyDepreciation: number;
  accumulatedDepreciation: number;
  bookValue: number;
};

export type PayrollRow = {
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

export type FundingEntry = {
  id: string;
  source: string;
  account: "CASH" | "BANK";
  label?: string | null;
  amount: number;
  date: string | Date;
};
