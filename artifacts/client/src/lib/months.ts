/**
 * Localized month names, and the `"2026-03"` → `"Mars 2026"` conversion.
 *
 * These were in `pages/reports/hooks/useReportFilters.ts`, where they were
 * reachable only through a hook module. The analysis page labels its trend chart
 * with the same month names and has no interest in report filters, so they moved
 * here rather than being imported across pages or re-spelled.
 *
 * They are now i18n-aware: `getMonths()` re-reads the active language on every
 * call so a switch mid-session is reflected on the next render, and `monthLabel`
 * builds its label on the caller's lane rather than on a module-load snapshot.
 */

import i18n from "@/i18n";

const MONTH_KEYS = [
  "months.january",
  "months.february",
  "months.march",
  "months.april",
  "months.may",
  "months.june",
  "months.july",
  "months.august",
  "months.september",
  "months.october",
  "months.november",
  "months.december",
] as const;

/** The 12 month names in the active language. */
export function getMonths(): string[] {
  return MONTH_KEYS.map((key) => i18n.t(key));
}

/** `"2025-03"` → `"Mars 2025"` in the active language. */
export function monthLabel(monthYear: string): string {
  const [year, month] = monthYear.split("-").map(Number);
  return `${i18n.t(MONTH_KEYS[month - 1])} ${year}`;
}