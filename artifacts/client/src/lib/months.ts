/**
 * French month names, and the `"2026-03"` → `"Mars 2026"` conversion.
 *
 * These were in `pages/reports/hooks/useReportFilters.ts`, where they were
 * reachable only through a hook module. The analysis page labels its trend chart
 * with the same month names and has no interest in report filters, so they moved
 * here rather than being imported across pages or re-spelled.
 */

export const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

/** `"2025-03"` → `"Mars 2025"`. */
export function monthLabel(monthYear: string): string {
  const [year, month] = monthYear.split("-").map(Number);
  return `${MONTHS[month - 1]} ${year}`;
}
