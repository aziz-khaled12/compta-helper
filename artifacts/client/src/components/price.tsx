import { priceLabel } from "@/lib/bundles";
import { cn } from "@/lib/utils";

/**
 * A bundle price rendered as an LTR token, `5 900 DA`.
 *
 * The isolate matters in Arabic: without `dir="ltr"` the bidi algorithm moves
 * the Latin `DA` to the start of the RTL line (`DA 5 900`). Same convention as
 * `ui/input.tsx`, which pins machine-readable tokens to LTR.
 */
export function Price({
  amount,
  className,
}: {
  amount: number;
  className?: string;
}) {
  return (
    <span dir="ltr" className={cn("inline-block", className)}>
      {priceLabel(amount)}
    </span>
  );
}
