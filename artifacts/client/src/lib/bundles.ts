/**
 * The subscription bundles ("formules") showcased on the landing page, listed
 * on `/pricing` and bought through the checkout gate.
 *
 * Prices are whole dinars per month. A yearly subscription is charged ten
 * months, so the discount is always exactly two months — the checkout shows
 * the annual total, never a derived monthly figure.
 *
 * Copy lives in the translation files (`bundle.<id>.name`, `.tagline` and
 * `.feature.N`), because every string must exist in French and Arabic.
 */

export const BUNDLE_IDS = ["essential", "pro", "enterprise"] as const;

export type BundleId = (typeof BUNDLE_IDS)[number];

export type BillingCycle = "monthly" | "yearly";

export type Bundle = {
  id: BundleId;
  /** Monthly price, in DA. */
  monthlyPrice: number;
  /** How many `bundle.<id>.feature.N` keys exist for this bundle. */
  featureCount: number;
  /** The recommended bundle, rendered with the featured treatment. */
  highlighted?: boolean;
};

/** A yearly subscription buys 12 months for the price of 10. */
export const YEARLY_MONTHS_CHARGED = 10;

const ESSENTIAL: Bundle = { id: "essential", monthlyPrice: 2_500, featureCount: 4 };
const PRO: Bundle = { id: "pro", monthlyPrice: 5_900, featureCount: 6, highlighted: true };
const ENTERPRISE: Bundle = { id: "enterprise", monthlyPrice: 12_000, featureCount: 5 };

export const BUNDLES: readonly Bundle[] = [ESSENTIAL, PRO, ENTERPRISE];

/** The bundle selected when the checkout is opened without a valid `?bundle=`. */
export const DEFAULT_BUNDLE_ID: BundleId = "pro";

export function isBundleId(value: unknown): value is BundleId {
  return (
    typeof value === "string" &&
    (BUNDLE_IDS as readonly string[]).includes(value)
  );
}

export function getBundle(id: string | null | undefined): Bundle {
  const match = BUNDLES.find((bundle) => bundle.id === id);
  return match ?? PRO;
}

export function isBillingCycle(value: unknown): value is BillingCycle {
  return value === "monthly" || value === "yearly";
}

/** What the customer is actually charged for one billing period. */
export function bundlePrice(bundle: Bundle, billing: BillingCycle): number {
  return billing === "yearly"
    ? bundle.monthlyPrice * YEARLY_MONTHS_CHARGED
    : bundle.monthlyPrice;
}

/**
 * Marketing price tag — `5 900 DA`.
 *
 * Deliberately not `fmt()`/`compactMoney()`: those scale ledger figures for
 * table cells and would render this price as `5,90 K DA`, which reads like a
 * rounding artefact on a price tag. Payloads still store the exact number.
 */
export function priceLabel(amount: number): string {
  // NBSP grouping rather than the ledger's narrow NBSP: at price-tag sizes the
  // narrow form looks like a missing separator (`5900 DA`).
  const formatted = amount
    .toLocaleString("fr-DZ", { maximumFractionDigits: 0 })
    .replace(/\u202f/g, "\u00a0");
  return `${formatted} DA`;
}
