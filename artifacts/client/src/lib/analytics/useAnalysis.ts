import { useMemo } from "react";
import { computeKpis, type KpiSnapshot } from "./metrics";
import { detectFindings } from "./detectors";
import type {
  AnalyticsInput,
  CompanyIdentity,
  Finding,
  InventoryItemRow,
} from "./types";
import type { AssetRow, MvRow, PayrollRow, TxRow } from "@/lib/ledger";

/**
 * The deterministic half of the assistant: the figures and the observations,
 * both derived in the browser from rows the page has already fetched.
 *
 * This is a memo over those rows — no request, no query key, no network — and
 * the same rows always produce the same numbers. That property is the point of
 * the whole feature: a figure on screen cannot change because the page reloaded.
 *
 * It returns the snapshot as well as the findings because both are readings of
 * one computation, and two hooks would mean computing it twice. It is separate
 * from `@/hooks/useInsights`, which layers narration on top, so that a consumer
 * wanting only a severity count — the reports page — does not spend a Gemini
 * call to get one.
 */

/** The rows analysis reads, in the shape the pages already hold them. */
export interface AnalysisSource {
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
  /** Pre-formatted by the page, e.g. "Janvier – Août 2026". */
  periodRef: string;
}

export interface AnalysisResult {
  findings: Finding[];
  kpi: KpiSnapshot;
}

export function useAnalysis(source: AnalysisSource, enabled: boolean): AnalysisResult {
  const { txns, mvs, items, assets, payrolls, company, from, to, periodRef } = source;

  // The clock, frozen at mount.
  //
  // Dormancy is the one rule measured against the present rather than the
  // selected period, so it needs a "now" — but a `new Date()` evaluated on every
  // render would make the memos below recompute constantly, and would re-narrate
  // with it. Freezing it means a session's answers stay consistent with each
  // other.
  const asOf = useMemo(() => new Date(), []);

  const input = useMemo<AnalyticsInput>(
    () => ({ txns, mvs, items, assets, payrolls, company, from, to, periodRef, asOf }),
    [txns, mvs, items, assets, payrolls, company, from, to, periodRef, asOf],
  );

  const kpi = useMemo(() => computeKpis(input), [input]);

  const findings = useMemo(
    () => (enabled ? detectFindings(kpi, input) : []),
    [kpi, input, enabled],
  );

  return { findings, kpi };
}
