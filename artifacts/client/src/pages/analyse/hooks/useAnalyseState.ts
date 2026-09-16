import { useMemo, useState } from "react";
import {
  useGetCompany,
  useListTransactions,
  useListInventoryItems,
  useListInventoryMovements,
  useListAssets,
  useListPayrolls,
} from "@workspace/api-client-react";
import { MONTHS, monthLabel } from "@/lib/months";
import { rangeStart, rangeEnd } from "@/lib/ledger";
import { useInsights } from "@/hooks/useInsights";

/**
 * Everything the analysis page reads, in one object.
 *
 * The five queries below are the same ones the reports page calls, with the same
 * parameters — so react-query serves both pages from a single cache entry and
 * moving between them costs no request.
 *
 * The period defaults to the current year to date rather than to a single month:
 * this page is about spotting a trend, and one month of a small business's books
 * is mostly noise.
 */
export function useAnalyseState() {
  const now = useMemo(() => new Date(), []);
  const year = now.getFullYear();

  const [fromYear, setFromYear] = useState(year);
  const [fromMonth, setFromMonth] = useState(1);
  const [toYear, setToYear] = useState(year);
  const [toMonth, setToMonth] = useState(now.getMonth() + 1);

  const { data: company } = useGetCompany();
  const { data: txns = [], isLoading: loadingTxns } = useListTransactions();
  const { data: mvs = [], isLoading: loadingMvs } = useListInventoryMovements();
  const { data: items = [] } = useListInventoryItems();
  const { data: assets = [], isLoading: loadingAssets } = useListAssets();
  const { data: payrolls = [], isLoading: loadingPayrolls } = useListPayrolls();

  const isLoading = loadingTxns || loadingMvs || loadingAssets || loadingPayrolls;

  // Detectors read movement names, not item ids — the same join the reports page
  // does before handing rows to any consumer.
  const nameById = useMemo(() => new Map(items.map((i) => [i.id, i.name])), [items]);
  const mvsWithNames = useMemo(
    () => mvs.map((m) => ({ ...m, itemName: nameById.get(m.itemId) || m.itemId })),
    [mvs, nameById],
  );

  // Memoised, not rebuilt per render: these feed the memos inside `useAnalysis`,
  // and a fresh `Date` on every keystroke would invalidate all of them.
  const from = useMemo(() => rangeStart(fromYear, fromMonth), [fromYear, fromMonth]);
  const to = useMemo(() => rangeEnd(toYear, toMonth), [toYear, toMonth]);

  const period =
    fromYear === toYear && fromMonth === toMonth
      ? monthLabel(`${fromYear}-${String(fromMonth).padStart(2, "0")}`)
      : `${MONTHS[fromMonth - 1]} ${fromYear} – ${MONTHS[toMonth - 1]} ${toYear}`;

  const insights = useInsights({
    txns,
    mvs: mvsWithNames,
    items,
    assets,
    payrolls,
    company,
    from,
    to,
    periodRef: period,
    enabled: !isLoading,
  });

  return {
    insights,
    company,
    period,
    // Eight years centred on the current one, the same span the reports page
    // offers — a small business's books rarely reach further back than that.
    years: Array.from({ length: 8 }, (_, i) => year - 3 + i),
    fromYear, setFromYear,
    fromMonth, setFromMonth,
    toYear, setToYear,
    toMonth, setToMonth,
    isLoading,
  };
}

export type AnalyseState = ReturnType<typeof useAnalyseState>;
