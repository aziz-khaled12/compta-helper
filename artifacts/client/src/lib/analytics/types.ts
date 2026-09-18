import type {
  AssetRow,
  MvRow,
  PayrollRow,
  TxRow,
} from "@/lib/ledger";

/**
 * The vocabulary the analytics layer speaks.
 *
 * Three layers, deliberately separate:
 *
 *   metrics.ts     numbers — deterministic, reproducible, no prose
 *   detectors.ts   Finding — an observation, with the figures that justify it
 *   knowledge-base what the user reads — explanation and remedy, per rule
 *
 * The split exists so that a figure can never drift from its explanation: the
 * detector supplies the numbers, the knowledge base supplies the words, and
 * neither writes the other's half. It is also what lets the whole panel work
 * with no model available — every word the user reads is already in the repo.
 */

/**
 * How loudly to say it.
 *
 * Three levels rather than five: a scale with more gradations than the user has
 * decisions to make just invites arguing about which one applies.
 */
export type Severity = "CRITICAL" | "WARNING" | "INFO";

/** Ordered most urgent first, for sorting a mixed list. */
export const SEVERITY_ORDER: Record<Severity, number> = {
  CRITICAL: 0,
  WARNING: 1,
  INFO: 2,
};

/**
 * One observation about the books.
 *
 * `ruleId` is the join key to the knowledge base and the only stable identifier
 * here — `title` is display text and may be reworded, so nothing should ever
 * switch on it.
 */
export interface Finding {
  ruleId: string;
  severity: Severity;
  /** The plain-language headline. Always present, never a code. */
  title: string;
  /** The figures behind the finding, already formatted for reading. */
  evidence: string[];
  /**
   * The raw numbers, unformatted.
   *
   * Kept alongside `evidence` because they are what the narration is allowed to
   * reason over: a model given pre-formatted strings can only re-word them,
   * whereas given numbers it can compare, rank, and prioritise. It is also what
   * makes a cached narration verifiable after the fact.
   */
  metrics: Record<string, number>;
  /** Which slice of time this speaks about, e.g. "Janvier – Août 2026". */
  periodRef: string;
  /** What the finding is about, when it is about one thing — a client, a product. */
  subject?: string;
}

/**
 * Everything the detectors may read, in one object.
 *
 * Passing a bundle rather than six positional arguments means adding a data
 * source later is a change in one place, and it keeps every detector's signature
 * identical — which is what lets them be registered as a plain array.
 */
export interface AnalyticsInput {
  txns: TxRow[];
  mvs: MvRow[];
  items: InventoryItemRow[];
  assets: AssetRow[];
  payrolls: PayrollRow[];
  company: CompanyIdentity | undefined;
  /** Inclusive. */
  from: Date;
  /** Inclusive. */
  to: Date;
  /** Pre-formatted by the page, so this layer stays free of locale and month names. */
  periodRef: string;
  /**
   * The clock, injected rather than read.
   *
   * Two of the rules are about the present state of the business rather than
   * about a period — how long a product has sat unmoved, how old an unpaid
   * invoice is in the real world. Those need a "now", and taking `to` instead
   * would mean a user selecting a period that ends in the future sees products
   * flagged as dormant the day after they were sold.
   *
   * Injected so that the behaviour is still deterministic under test, which is
   * the only reason the rest of this file can promise reproducibility at all.
   */
  asOf: Date;
}

/** The subset of `Company` the detectors care about. */
export interface CompanyIdentity {
  legalForm?: string | null;
  taxRegime?: string | null;
}

/** The subset of `InventoryItem` the detectors care about. */
export interface InventoryItemRow {
  id: string;
  name: string;
  unit?: string | null;
  balance: number;
  averageCost: number;
  totalValue: number;
}
