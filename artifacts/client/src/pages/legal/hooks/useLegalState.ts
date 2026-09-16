import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListLegalAlertsQueryKey,
  useAcknowledgeLegalAlert,
  useListLegalAlerts,
  useRefreshLegalAlerts,
  type LegalAlert,
  type LegalAlertRelevance,
} from "@workspace/api-client-react";

/** Highest first — the order the user should triage in. */
const RELEVANCE_ORDER: Record<LegalAlertRelevance, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

export interface LegalCounts {
  total: number;
  high: number;
  medium: number;
  low: number;
}

export function useLegalState() {
  const [includeAcknowledged, setIncludeAcknowledged] = useState(false);
  const queryClient = useQueryClient();

  const params = { includeAcknowledged };
  const { data, isLoading, isError, error } = useListLegalAlerts(params);

  /**
   * Every mutation invalidates the list rather than patching the cache.
   *
   * The server decides what an alert's score and relevance are, and the
   * acknowledged filter changes which rows are returned at all — so a locally
   * spliced array would drift from what the next fetch returns. The generated
   * key helper is used instead of a literal so a change to the key shape cannot
   * silently leave this stale.
   */
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListLegalAlertsQueryKey(params) });

  const acknowledge = useAcknowledgeLegalAlert({
    mutation: { onSuccess: () => void invalidate() },
  });

  const refresh = useRefreshLegalAlerts({
    mutation: { onSuccess: () => void invalidate() },
  });

  const alerts = (data ?? []).slice().sort((a, b) => {
    const byRelevance = RELEVANCE_ORDER[a.relevance] - RELEVANCE_ORDER[b.relevance];
    if (byRelevance !== 0) return byRelevance;
    // Same severity: newest text first, which is what the API already does —
    // re-applied here because sort() would otherwise leave ties arbitrary.
    return String(b.publishedOn ?? "").localeCompare(String(a.publishedOn ?? ""));
  });

  const counts: LegalCounts = {
    total: alerts.length,
    high: alerts.filter((a) => a.relevance === "HIGH").length,
    medium: alerts.filter((a) => a.relevance === "MEDIUM").length,
    low: alerts.filter((a) => a.relevance === "LOW").length,
  };

  const acknowledgeAlert = (alert: LegalAlert) => {
    if (acknowledge.isPending) return;
    acknowledge.mutate({ id: alert.id });
  };

  return {
    alerts,
    counts,
    isLoading,
    isError,
    error,
    includeAcknowledged,
    setIncludeAcknowledged,
    acknowledgeAlert,
    acknowledgingId: acknowledge.isPending ? (acknowledge.variables?.id ?? null) : null,
    refresh: () => refresh.mutate(),
    isRefreshing: refresh.isPending,
    refreshedCount: refresh.data?.refreshed ?? null,
  };
}

export type LegalState = ReturnType<typeof useLegalState>;
