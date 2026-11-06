import { compactMoney, exactMoney } from "@/lib/money";

/**
 * A money figure that is compact on screen and exact on inspection.
 *
 * `title` gives the full amount on hover; `aria-label` gives it to assistive
 * tech, so the compacting never costs a reader the real number. Use `<Money>`
 * wherever the amount is a plain JSX value, and `formatMoney()` when it has to
 * be interpolated into a sentence (`t("...", { amount: formatMoney(n) })`) —
 * a translated string cannot hold an element.
 */
export function Money({
  value,
  className,
}: {
  value: number | null | undefined;
  className?: string;
}) {
  const amount = value ?? 0;
  const exact = exactMoney(amount);
  return (
    <span title={exact} aria-label={exact} className={className}>
      {compactMoney(amount)}
    </span>
  );
}
