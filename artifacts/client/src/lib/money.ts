/**
 * How every figure in this app is written.
 *
 * Algerian amounts reach ten digits quickly — `12 345 678,90 DA` is wider than
 * the column it sits in, and it is the totals (bilan, CA, masse salariale) that
 * are widest exactly where space is tightest. So what the screen *shows* is
 * scaled at the thousand/million boundary — `12,35 M DA` — while the exact
 * figure is never lost:
 *
 *  - `<Money>` (components/money.tsx) carries it in `title` (hover) and
 *    `aria-label` (assistive tech);
 *  - `exactMoney()` is what the report exports use, because a CSV or a PDF
 *    handed to an accountant must stay exact;
 *  - the inputs are untouched — `max={remaining}` and the payment API still
 *    deal in full precision, so compacting never changes what is recorded.
 *
 * The unit words live in the translation files (`money.thousand` /
 * `money.million`) so Arabic reads `12,35 ألف DA`, not a lone Latin `K`. The
 * digits stay Western Arabic (the app formats numbers as `fr-DZ` in both
 * languages), and so does the `DA` suffix — same convention as `i18n/ar.ts`
 * documents for every other abbreviation.
 */
import i18n from "@/i18n";

const THOUSAND = 1_000;
const MILLION = 1_000_000;

/**
 * Non-breaking space between the digits and the unit, so `12,35 M` never wraps
 * into two pieces at the end of a narrow table cell.
 */
const NBSP = "\u00A0";

/** Two decimals, `fr-DZ` grouping (narrow no-break space), no currency. */
function decimal(n: number): string {
  return n.toLocaleString("fr-DZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function unitWord(unit: "k" | "m"): string {
  return i18n.t(unit === "k" ? "money.thousand" : "money.million", {
    defaultValue: unit === "k" ? "K" : "M",
  });
}

/**
 * The scaled number alone, `12 345 678,9` -> `"12,35 M"`, `1 234,5` -> `"1,23 K"`.
 * Anything under a thousand is left exactly as it is.
 *
 * Rounding is resolved *before* the unit is chosen: `999 999,999` must not
 * print as a nonsensical `1 000,00 K`, so it promotes to `1,00 M` instead.
 */
export function compactAmount(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  let value = abs;
  let unit: "k" | "m" | null = null;

  if (abs >= MILLION) {
    value = abs / MILLION;
    unit = "m";
  } else if (abs >= THOUSAND) {
    value = abs / THOUSAND;
    unit = "k";
    if (Number(value.toFixed(2)) >= THOUSAND) {
      value = abs / MILLION;
      unit = "m";
    }
  }

  return sign + decimal(value) + (unit ? NBSP + unitWord(unit) : "");
}

/** `compactAmount` plus the `DA` suffix — what the screens render. */
export function compactMoney(n: number): string {
  return `${compactAmount(n)} DA`;
}

/**
 * Chart-axis ticks: compact, but a bare `0` at the origin instead of `0,00`
 * (an axis reading `0,00 / 25,00 K / 50,00 K` is more noise than information).
 */
export function compactTick(n: number): string {
  return n === 0 ? "0" : compactAmount(n);
}

/** The full figure, `1 234 567,89 DA`. Tooltips, exports, anything auditable. */
export function exactMoney(n: number): string {
  return `${decimal(n)} DA`;
}
