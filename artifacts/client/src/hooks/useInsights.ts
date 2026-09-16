import { useEffect, useMemo, useRef } from "react";
import { useNarrateInsights } from "@workspace/api-client-react";
import type { InsightsNarrative } from "@workspace/api-client-react";
import { useAnalysis, type AnalysisSource } from "@/lib/analytics/useAnalysis";
import type { Finding } from "@/lib/analytics/types";
import type { KpiSnapshot } from "@/lib/analytics/metrics";

type UseInsightsArgs = AnalysisSource & {
  enabled: boolean;
};

export interface InsightsState {
  findings: Finding[];
  /** The figures behind the findings, for the pages that draw them. */
  kpi: KpiSnapshot;
  narrative: InsightsNarrative | undefined;
  /** True while the deterministic pass is still waiting on its rows. */
  isLoading: boolean;
  /** True while narration is in flight — the findings are already readable. */
  isNarrating: boolean;
  /**
   * True when narration failed and the panel is showing knowledge-base text
   * alone. Not an error state: every finding still has its explanation.
   */
  narrationUnavailable: boolean;
}

/**
 * Detection and narration, in that order, with detection first because it is
 * the half that always works.
 *
 * Detection is `useAnalysis` — a pure memo over rows the page already fetched.
 * Narration is an optional extra layered on top, and everything below is
 * arranged so that its failure leaves the panel intact rather than empty.
 */
export function useInsights({
  txns,
  mvs,
  items,
  assets,
  payrolls,
  company,
  from,
  to,
  periodRef,
  enabled,
}: UseInsightsArgs): InsightsState {
  const { findings, kpi } = useAnalysis(
    { txns, mvs, items, assets, payrolls, company, from, to, periodRef },
    enabled,
  );

  // A stable identity for the current findings, used to decide whether the
  // stored narration still describes what is on screen. Deliberately not the
  // server's hash — that one is a cache key and may change independently — this
  // one only has to answer "are these the same findings as last time?".
  const signature = useMemo(
    () =>
      findings.length === 0
        ? ""
        : JSON.stringify(
            findings
              .map((f) => [f.ruleId, f.severity, f.subject ?? "", f.evidence])
              .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
          ),
    [findings],
  );

  const narrate = useNarrateInsights();

  // Which findings the current narrative was written for, so a stale one is
  // never shown against a changed panel.
  const narratedFor = useRef<string>("");
  const inFlight = useRef<string>("");

  useEffect(() => {
    if (!enabled || !signature) return;
    if (narratedFor.current === signature || inFlight.current === signature) return;

    inFlight.current = signature;
    narrate.mutate(
      {
        data: {
          // `format: date` on the wire, so the contract takes "YYYY-MM-DD".
          // Safe to read these as UTC: `rangeStart`/`rangeEnd` build them with
          // `Date.UTC`, so the ISO day is the day the user picked.
          periodFrom: from.toISOString().slice(0, 10),
          periodTo: to.toISOString().slice(0, 10),
          findings: findings.map((f) => ({
            ruleId: f.ruleId,
            severity: f.severity,
            title: f.title,
            evidence: f.evidence,
            metrics: f.metrics,
            periodRef: f.periodRef,
            subject: f.subject ?? null,
          })),
        },
      },
      {
        onSuccess: () => {
          narratedFor.current = signature;
          inFlight.current = "";
        },
        // Cleared rather than recorded as narrated, so a later change in the
        // books — or a reload once the key is configured — tries again instead
        // of leaving the panel permanently without prose.
        onError: () => {
          inFlight.current = "";
        },
      },
    );
    // `narrate` is intentionally omitted: the mutation object is rebuilt on
    // every render, so depending on it would re-fire this effect in a loop.
    // `inFlight`/`narratedFor` are the guards that make that safe.
  }, [signature, enabled, from, to, findings]);

  const narrativeMatches =
    narratedFor.current === signature && signature !== ""
      ? narrate.data
      : undefined;

  return {
    findings,
    kpi,
    narrative: narrativeMatches,
    // The page owns the loading state of the rows; by the time this hook sees
    // an empty array it is either genuinely empty or still arriving, and both
    // render the same way — nothing to report.
    isLoading: false,
    isNarrating: narrate.isPending,
    narrationUnavailable: narrate.isError,
  };
}
