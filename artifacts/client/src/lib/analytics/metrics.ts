import { inRange, type AssetRow, type TxRow } from "@/lib/ledger";
import { IFU_CEILING } from "@/lib/taxRegime";
import type { AnalyticsInput, InventoryItemRow } from "./types";

/**
 * The numbers, and nothing else.
 *
 * Every value here is a pure function of the rows the reports page already
 * holds. Nothing is fetched, nothing is cached, nothing is inferred by a model —
 * so reloading the page cannot change a figure, and two people looking at the
 * same books see the same analysis. That property is the reason the narration
 * layer downstream is allowed to exist at all: it can only re-word these.
 *
 * The snapshot deliberately carries a few row-level lists next to the
 * aggregates (the outliers, the suspects, the unpaid). A detector needs to name
 * *which* entry is wrong — "un montant est aberrant" is not actionable, "la
 * facture du 12/03 de 4 800 000 DA" is — and re-deriving that downstream would
 * mean two implementations of the same arithmetic.
 */

/** A month of activity, keyed `YYYY-MM`. */
export interface MonthSeries {
  monthYear: string;
  revenueHt: number;
  cogs: number;
  grossMarginHt: number;
  /**
   * `null`, not 0, when there was no revenue.
   *
   * A month with 500 DA of costs and no sales did not have a −∞ % margin and it
   * did not have a 0 % margin; the ratio is undefined. Collapsing it to a number
   * would make the erosion detector read a division artefact as a trend.
   */
  grossMarginPct: number | null;
  purchasesHt: number;
  expensesHt: number;
}

/** What a group of unpaid (or partially paid) entries adds up to. */
export interface AgedBalance {
  amountTtc: number;
  count: number;
  /** Days between the oldest open entry and the end of the period. `null` if none. */
  oldestDays: number | null;
  /** Oldest first — the order a user would chase them in. */
  oldest: { label: string; thirdParty: string; date: string; days: number; amountTtc: number }[];
}

export interface CategoryTotal {
  category: string;
  amount: number;
}

/** A pair of entries that look like one entry entered twice. */
export interface DuplicateSuspect {
  thirdParty: string;
  amountTtc: number;
  entries: { id: string; date: string; label: string }[];
}

/** An amount far away from its own category's distribution. */
export interface Outlier {
  id: string;
  category: string;
  amount: number;
  date: string;
  label: string;
  /** How many interquartile ranges past the fence it sits. */
  distance: number;
}

export interface BenfordResult {
  sampleSize: number;
  /** Observed share of each leading digit 1..9, as fractions summing to ~1. */
  observed: number[];
  /** Pearson statistic against the Benford expectation. */
  chiSquare: number;
  /** The value the statistic is compared against; supplied, not looked up. */
  criticalValue: number;
}

export interface KpiSnapshot {
  periodRef: string;
  months: MonthSeries[];

  revenueHt: number;
  purchasesHt: number;
  expensesHt: number;
  cogs: number;
  grossMarginHt: number;
  grossMarginPct: number | null;

  tvaCollected: number;
  tvaDeductible: number;
  /** Positive means there is VAT to pay; negative means a credit to carry forward. */
  tvaNet: number;

  payrollGross: number;
  payrollToRevenuePct: number | null;

  cash: number;
  bank: number;
  stockValue: number;

  receivables: AgedBalance;
  payables: AgedBalance;

  /** Largest first. */
  expensesByCategory: CategoryTotal[];

  // --- row-level, for the detectors that must name what they found ----------
  salesWithoutThirdParty: TxRow[];
  purchasesWithoutThirdParty: TxRow[];
  salesWithoutCost: TxRow[];
  unusualVatRate: TxRow[];
  duplicates: DuplicateSuspect[];
  outliers: Outlier[];
  negativeStock: InventoryItemRow[];
  dormantStock: InventoryItemRow[];
  fullyDepreciated: AssetRow[];
  benford: BenfordResult | null;
}

// --- primitives -------------------------------------------------------------

/**
 * `YYYY-MM` for either representation a row might carry.
 *
 * Date columns come back from the API as plain `"YYYY-MM-DD"` strings, so the
 * string branch is the one that normally runs. The `Date` branch exists for
 * payroll timestamps and goes through the local getters deliberately: an
 * `toISOString()` here would push a late-evening entry into the next month.
 */
export function monthKeyOf(date: string | Date): string {
  if (typeof date === "string") return date.slice(0, 7);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

const DAY_MS = 86_400_000;

/** Whole days from `from` to `to`, floor, never negative. */
export function daysBetween(from: string | Date, to: Date): number {
  const a = typeof from === "string" ? new Date(`${from}T00:00:00Z`) : from;
  const ms = to.getTime() - a.getTime();
  return Math.max(0, Math.floor(ms / DAY_MS));
}

/**
 * What is still owed on an entry.
 *
 * `PARTIAL` is treated as exactly half paid. That is not a measurement — the
 * schema stores a status, not an amount paid — it is the same convention the
 * « Ventes & Clients » and « Achats & Fournisseurs » reports already use. The
 * duplication is deliberate and is the lesser evil: the insights panel sits
 * directly beside those reports, and two different answers to "reste à payer"
 * on one screen reads as a bug to the user, not as a nuance.
 */
export function outstandingTtc(t: TxRow): number {
  if (t.status === "PAID") return 0;
  if (t.status === "PARTIAL") return t.amountTtc * 0.5;
  return t.amountTtc;
}

/** A ratio, or `null` when the denominator cannot support one. */
function ratio(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : numerator / denominator;
}

/**
 * Groups open entries into 0–30 / 31–60 / 61–90 / 90+ days.
 *
 * Age is measured against the **end of the selected period**, not against the
 * clock. A metric that changes while the user reads it — or that disagrees with
 * the period printed on the report — is worse than one that is a day stale, and
 * every other figure on this page is bounded by that same period.
 */
function agedBalance(rows: TxRow[], to: Date): AgedBalance {
  const open = rows.filter((t) => outstandingTtc(t) > 0);
  const aged = open
    .map((t) => ({
      label: t.label,
      thirdParty: t.thirdParty ?? "",
      date: String(t.date),
      days: daysBetween(t.date, to),
      amountTtc: outstandingTtc(t),
    }))
    .sort((a, b) => b.days - a.days);

  return {
    amountTtc: aged.reduce((s, r) => s + r.amountTtc, 0),
    count: aged.length,
    oldestDays: aged.length ? aged[0]!.days : null,
    oldest: aged.slice(0, 5),
  };
}

/** Tukey fences: 1.5 × IQR beyond each quartile. */
function iqrFences(values: number[]): { low: number; high: number; iqr: number } | null {
  if (values.length < 4) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const at = (q: number) => {
    const pos = (sorted.length - 1) * q;
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (pos - lo);
  };
  const q1 = at(0.25);
  const q3 = at(0.75);
  const iqr = q3 - q1;
  if (iqr === 0) return null;
  return { low: q1 - 1.5 * iqr, high: q3 + 1.5 * iqr, iqr };
}

const BENFORD_EXPECTED = [
  0.30103, 0.176091, 0.124939, 0.09691, 0.079181, 0.066947, 0.057992, 0.051153,
  0.045757,
];

/** Sample size below which the first-digit test says nothing at all. */
export const BENFORD_MIN_SAMPLE = 100;

/**
 * 95th-percentile critical value for a chi-square with 8 degrees of freedom.
 *
 * Shipped as a constant rather than pulled from a statistics table at runtime:
 * it is one number, it never changes, and a dependency for it would be absurd.
 */
export const BENFORD_CRITICAL = 15.507;

/**
 * Benford's first-digit test, or `null` when the sample is too small to mean
 * anything.
 *
 * Gated on `BENFORD_MIN_SAMPLE` because the test is only meaningful in bulk. On
 * a few dozen entries almost any distribution looks anomalous, so an ungated
 * version would fire on every small business in the country on their first day.
 * Returning `null` rather than a weak result is the whole design: the panel says
 * nothing rather than something it cannot support.
 */
function benford(amounts: number[]): BenfordResult | null {
  const usable = amounts.filter((a) => Number.isFinite(a) && a > 0);
  if (usable.length < BENFORD_MIN_SAMPLE) return null;

  const counts = new Array(9).fill(0) as number[];
  for (const amount of usable) {
    const first = Number(String(Math.abs(amount)).replace(/^0\.0*/, "").charAt(0));
    if (first >= 1 && first <= 9) counts[first - 1]! += 1;
  }
  const n = counts.reduce((s, c) => s + c, 0);
  if (n < BENFORD_MIN_SAMPLE) return null;

  const observed = counts.map((c) => c / n);
  const chiSquare = observed.reduce((sum, o, i) => {
    const e = BENFORD_EXPECTED[i]!;
    return sum + ((o - e) ** 2) / e;
  }, 0);

  return { sampleSize: n, observed, chiSquare, criticalValue: BENFORD_CRITICAL };
}

const NO_CATEGORY = "Sans catégorie";

/**
 * Entries sharing a third party, an amount, and a near-identical date.
 *
 * Three days apart, inclusive: far enough apart to catch the same invoice
 * entered on a Friday and again on the Monday, close enough that two genuinely
 * separate orders of an identical amount in the same week are rare.
 */
const DUPLICATE_WINDOW_DAYS = 3;

function findDuplicates(txns: TxRow[]): DuplicateSuspect[] {
  const groups = new Map<string, TxRow[]>();
  for (const t of txns) {
    const thirdParty = (t.thirdParty ?? "").trim();
    // An entry with no third party cannot be called a duplicate of anything —
    // there is nothing to say the two were the same transaction.
    if (!thirdParty) continue;
    const key = `${thirdParty.toLowerCase()}|${t.amountTtc.toFixed(2)}|${t.type}`;
    const bucket = groups.get(key);
    if (bucket) bucket.push(t);
    else groups.set(key, [t]);
  }

  const suspects: DuplicateSuspect[] = [];
  for (const [key, rows] of groups) {
    if (rows.length < 2) continue;
    const sorted = [...rows].sort((a, b) => String(a.date).localeCompare(String(b.date)));

    // A window, not a full pairwise sweep: three entries of the same amount on
    // the same day would otherwise be reported as several distinct duplicate
    // pairs, which reads as three problems where there is one.
    let run: TxRow[] = [sorted[0]!];
    for (let i = 1; i < sorted.length; i += 1) {
      const current = sorted[i]!;
      const previous = run[run.length - 1]!;
      const gap = Math.abs(
        daysBetween(previous.date, new Date(`${String(current.date)}T00:00:00Z`)),
      );
      if (gap <= DUPLICATE_WINDOW_DAYS) run.push(current);
      else {
        if (run.length >= 2) suspects.push(toSuspect(run, key));
        run = [current];
      }
    }
    if (run.length >= 2) suspects.push(toSuspect(run, key));
  }
  return suspects;
}

function toSuspect(run: TxRow[], key: string): DuplicateSuspect {
  const [thirdParty = "", amount = "0"] = key.split("|");
  return {
    thirdParty,
    amountTtc: Number(amount),
    entries: run.map((t) => ({ id: t.id, date: String(t.date), label: t.label })),
  };
}

/** Per-category Tukey outliers. Categories with too little spread produce none. */
function findOutliers(txns: TxRow[]): Outlier[] {
  const byCategory = new Map<string, TxRow[]>();
  for (const t of txns) {
    const category = (t.category ?? "").trim() || NO_CATEGORY;
    const bucket = byCategory.get(category);
    if (bucket) bucket.push(t);
    else byCategory.set(category, [t]);
  }

  const outliers: Outlier[] = [];
  for (const [category, rows] of byCategory) {
    const fences = iqrFences(rows.map((t) => t.amountHt));
    if (!fences) continue;
    for (const t of rows) {
      const beyond =
        t.amountHt > fences.high
          ? t.amountHt - fences.high
          : t.amountHt < fences.low
            ? fences.low - t.amountHt
            : 0;
      if (beyond <= 0) continue;
      outliers.push({
        id: t.id,
        category,
        amount: t.amountHt,
        date: String(t.date),
        label: t.label,
        distance: beyond / fences.iqr,
      });
    }
  }
  return outliers.sort((a, b) => b.distance - a.distance);
}

/** Products that have not moved in this long are considered dormant. */
export const DORMANT_DAYS = 180;

// --- the snapshot -----------------------------------------------------------

/**
 * Builds the whole analytics view of the books in one pass.
 *
 * Everything is bounded by `[from, to]` except the two things that are
 * inherently "as things stand now" — the stock balances and the asset register,
 * which are running totals the schema maintains rather than period sums. Mixing
 * the two would be a category error: a stock level is not a period figure.
 */
export function computeKpis(input: AnalyticsInput): KpiSnapshot {
  const { txns, mvs, items, assets, payrolls, from, to, periodRef, asOf } = input;
  const inPeriod = txns.filter((t) => inRange(t.date, from, to));
  const ofType = (type: string) => inPeriod.filter((t) => t.type === type);

  const sales = ofType("SALE");
  const purchases = ofType("PURCHASE");
  const expenses = ofType("EXPENSE");

  const sum = (rows: TxRow[], pick: (t: TxRow) => number) =>
    rows.reduce((s, t) => s + pick(t), 0);

  const revenueHt = sum(sales, (t) => t.amountHt);
  const purchasesHt = sum(purchases, (t) => t.amountHt);
  const expensesHt = sum(expenses, (t) => t.amountHt);
  const cogs = sum(sales, (t) => t.costOfGoodsSold ?? 0);
  const grossMarginHt = revenueHt - cogs;

  const tvaCollected = sum(sales, (t) => t.tvaAmount);
  const tvaDeductible = sum(purchases, (t) => t.tvaAmount) + sum(expenses, (t) => t.tvaAmount);

  const periodPayrolls = payrolls.filter((p) => {
    const month = `${p.monthYear}-01`;
    return inRange(month, from, to);
  });
  const payrollGross = periodPayrolls.reduce((s, p) => s + p.grossSalary, 0);

  // Cash and bank are running balances over the whole book, not period sums —
  // a balance is a position, and netting only the selected months would report
  // a number no statement anywhere agrees with.
  const paidThrough = (method: string) =>
    txns
      .filter((t) => t.paymentMethod === method && t.status === "PAID")
      .reduce((s, t) => s + (t.type === "SALE" ? t.amountTtc : -t.amountTtc), 0);

  const months = buildMonthSeries(inPeriod, from, to);
  const stockValue = items.reduce((s, i) => s + i.totalValue, 0);

  return {
    periodRef,
    months,

    revenueHt,
    purchasesHt,
    expensesHt,
    cogs,
    grossMarginHt,
    grossMarginPct: ratio(grossMarginHt, revenueHt),

    tvaCollected,
    tvaDeductible,
    tvaNet: tvaCollected - tvaDeductible,

    payrollGross,
    payrollToRevenuePct: ratio(payrollGross, revenueHt),

    cash: paidThrough("CASH"),
    bank: paidThrough("BANK"),
    stockValue,

    receivables: agedBalance(sales, to),
    payables: agedBalance(purchases, to),

    expensesByCategory: groupByCategory([...purchases, ...expenses]),

    salesWithoutThirdParty: sales.filter((t) => !(t.thirdParty ?? "").trim()),
    purchasesWithoutThirdParty: purchases.filter((t) => !(t.thirdParty ?? "").trim()),
    salesWithoutCost: sales.filter((t) => t.costOfGoodsSold == null),
    unusualVatRate: inPeriod.filter((t) => !STANDARD_VAT_RATES.includes(t.tvaRate)),

    duplicates: findDuplicates(inPeriod),
    outliers: findOutliers(inPeriod),

    negativeStock: items.filter((i) => i.balance < 0),
    dormantStock: dormantItems(items, mvs, asOf),
    fullyDepreciated: assets.filter(
      (a) => a.bookValue <= a.residualValue && a.accumulatedDepreciation > 0,
    ),

    benford: benford(inPeriod.map((t) => t.amountHt)),
  };
}

/**
 * The VAT rates in ordinary use, as percentages.
 *
 * `tvaRate` is stored as a percentage (19, not 0.19) and rendered as `19 %` in
 * the journal, so the comparison happens in the same unit the user sees.
 * Zero is included because an exoneration is a legitimate rate, not an anomaly.
 */
export const STANDARD_VAT_RATES = [0, 9, 19];

const IFU_APPROACH_FRACTION = 0.85;

/** How close to the IFU ceiling counts as "approaching" it. */
export const IFU_NEAR_THRESHOLD = IFU_CEILING * IFU_APPROACH_FRACTION;

function groupByCategory(rows: TxRow[]): CategoryTotal[] {
  const totals = new Map<string, number>();
  for (const t of rows) {
    const category = (t.category ?? "").trim() || NO_CATEGORY;
    totals.set(category, (totals.get(category) ?? 0) + t.amountHt);
  }
  return [...totals]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

/** Every month the period touches, so a quiet month is a zero and not a gap. */
function buildMonthSeries(rows: TxRow[], from: Date, to: Date): MonthSeries[] {
  const byMonth = new Map<string, MonthSeries>();
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  const last = new Date(to.getFullYear(), to.getMonth(), 1);

  while (cursor <= last) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    byMonth.set(key, {
      monthYear: key,
      revenueHt: 0,
      cogs: 0,
      grossMarginHt: 0,
      grossMarginPct: null,
      purchasesHt: 0,
      expensesHt: 0,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  for (const t of rows) {
    const month = byMonth.get(monthKeyOf(t.date));
    if (!month) continue;
    if (t.type === "SALE") {
      month.revenueHt += t.amountHt;
      month.cogs += t.costOfGoodsSold ?? 0;
    } else if (t.type === "PURCHASE") {
      month.purchasesHt += t.amountHt;
    } else if (t.type === "EXPENSE") {
      month.expensesHt += t.amountHt;
    }
  }

  for (const month of byMonth.values()) {
    month.grossMarginHt = month.revenueHt - month.cogs;
    month.grossMarginPct = ratio(month.grossMarginHt, month.revenueHt);
  }

  return [...byMonth.values()].sort((a, b) => a.monthYear.localeCompare(b.monthYear));
}

/**
 * Items whose last movement is older than `DORMANT_DAYS`, or that never moved.
 *
 * Measured against `asOf`, not against the end of the period, and the difference
 * is not pedantic: "this product has not moved in six months" is a statement
 * about the shelf in front of the user, not about a window they picked in a
 * dropdown. Anchoring it to the period made a user who selected a period ending
 * in the future see their freshest products reported as dead stock.
 */
function dormantItems(
  items: InventoryItemRow[],
  mvs: { itemId: string; date: string | Date }[],
  asOf: Date,
): InventoryItemRow[] {
  const lastMove = new Map<string, number>();
  for (const m of mvs) {
    const days = daysBetween(m.date, asOf);
    const current = lastMove.get(m.itemId);
    if (current === undefined || days < current) lastMove.set(m.itemId, days);
  }
  return items.filter((i) => {
    // Only worth flagging if there is money tied up in it.
    if (i.totalValue <= 0) return false;
    const age = lastMove.get(i.id);
    return age === undefined || age > DORMANT_DAYS;
  });
}

/** Re-exported so detectors do not need to reach into `taxRegime` themselves. */
export { IFU_CEILING };
