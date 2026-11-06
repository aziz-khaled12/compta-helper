import { format, formatDistanceToNow, parseISO } from "date-fns";
import { ar, fr } from "date-fns/locale";
import i18n from "@/i18n";
import { compactMoney } from "@/lib/money";

function dateLocale() {
  return i18n.resolvedLanguage?.startsWith("ar") ? ar : fr;
}

/**
 * Compact money for places a string is required (translated sentences, chart
 * tooltips, `aria-label` props): `12,35 M DA`. Screens that render the figure
 * as JSX use `<Money>` instead so the exact amount stays hoverable — see
 * `lib/money.ts` for why the app scales at K/M at all.
 */
export function formatMoney(amount: number | undefined | null): string {
  return compactMoney(amount ?? 0);
}

export function formatDate(date: string | Date | undefined | null, dateFormat = "dd MMM yyyy"): string {
  if (!date) return "-";
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, dateFormat, { locale: dateLocale() });
}

export function formatRelative(date: string | Date | undefined | null): string {
  if (!date) return "-";
  const d = typeof date === "string" ? parseISO(date) : date;
  return formatDistanceToNow(d, { locale: dateLocale(), addSuffix: true });
}