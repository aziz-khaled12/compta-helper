/**
 * The subscription plans ("formules") and the services sold one by one.
 *
 * Two packs replace the old three-bundle ladder:
 *  - `full`    — every service, 6 000 DA / month
 *  - `partial` — dashboard, stock and journal, 2 500 DA / month, then
 *                + 1 000 DA / month for every other service the user wants
 *
 * Add-ons only exist on the partial pack: the full pack already contains them
 * all, so `planMonthlyPrice("full", …)` deliberately ignores the service list.
 *
 * Prices are whole dinars per month. A yearly subscription is charged ten
 * months, so the discount is always exactly two months — the checkout shows
 * the annual total, never a derived monthly figure.
 *
 * Copy lives in the translation files (`plan.<id>.name`, `.tagline`,
 * `.feature.N`, plus today's `nav.*` labels for the service names), because
 * every string must exist in French and Arabic.
 */

export const PLAN_IDS = ["full", "partial"] as const;

export type PlanId = (typeof PLAN_IDS)[number];

/** Services that come with the partial pack — the product's floor. */
export const CORE_SERVICES = ["dashboard", "inventory", "journal"] as const;

export type CoreServiceId = (typeof CORE_SERVICES)[number];

/** Services bought individually on top of the partial pack. */
export const ADDON_SERVICES = [
  "assets",
  "debts",
  "employees",
  "payroll",
  "reports",
  "analyse",
  "legal",
] as const;

export type ServiceId = (typeof ADDON_SERVICES)[number];

export type AnyServiceId = CoreServiceId | ServiceId;

/** Monthly price of the full pack, in DA. */
export const FULL_PRICE = 6_000;
/** Monthly price of the partial pack, in DA (dashboard, stock and journal). */
export const PARTIAL_PRICE = 2_500;
/** Monthly price of one extra service on the partial pack, in DA. */
export const ADDON_PRICE = 1_000;
/** Users per company. One for every plan until seats are actually sold. */
export const SEATS = 1;
/** Length of the full-pack trial, in days. */
export const TRIAL_DAYS = 7;

export const BILLING_CYCLES = ["monthly", "yearly"] as const;

export type BillingCycle = (typeof BILLING_CYCLES)[number];

/** A yearly subscription buys 12 months for the price of 10. */
export const YEARLY_MONTHS_CHARGED = 10;

export type Plan = {
  id: PlanId;
  /** Monthly price without any add-on, in DA. */
  monthlyPrice: number;
  /** How many `plan.<id>.feature.N` keys exist for this plan. */
  featureCount: number;
  /** The recommended plan, rendered with the featured treatment. */
  highlighted?: boolean;
};

const FULL: Plan = {
  id: "full",
  monthlyPrice: FULL_PRICE,
  featureCount: 5,
  highlighted: true,
};

const PARTIAL: Plan = {
  id: "partial",
  monthlyPrice: PARTIAL_PRICE,
  featureCount: 4,
};

export const PLANS: readonly Plan[] = [FULL, PARTIAL];

/** The plan selected when the checkout is opened without a valid `?plan=`. */
export const DEFAULT_PLAN_ID: PlanId = "full";

export type ServiceMeta = {
  id: AnyServiceId;
  href: string;
  /** Existing sidebar label — one name per service, in both locales. */
  nameKey: string;
  /** `true` for the services the partial pack always includes. */
  core: boolean;
};

export const SERVICE_CATALOG: readonly ServiceMeta[] = [
  { id: "dashboard", href: "/", nameKey: "nav.dashboard", core: true },
  { id: "inventory", href: "/inventory", nameKey: "nav.inventory", core: true },
  { id: "journal", href: "/journal", nameKey: "nav.journal", core: true },
  { id: "assets", href: "/resources", nameKey: "nav.resources", core: false },
  { id: "debts", href: "/debts", nameKey: "nav.debts", core: false },
  { id: "employees", href: "/employees", nameKey: "nav.employees", core: false },
  { id: "payroll", href: "/payroll", nameKey: "nav.payroll", core: false },
  { id: "reports", href: "/reports", nameKey: "nav.reports", core: false },
  { id: "analyse", href: "/analyse", nameKey: "nav.analyse", core: false },
  { id: "legal", href: "/legal", nameKey: "nav.legal", core: false },
];

export function serviceMeta(id: AnyServiceId): ServiceMeta {
  return SERVICE_CATALOG.find((entry) => entry.id === id) ?? SERVICE_CATALOG[0];
}

export function isPlanId(value: unknown): value is PlanId {
  return (
    typeof value === "string" && (PLAN_IDS as readonly string[]).includes(value)
  );
}

export function isServiceId(value: unknown): value is ServiceId {
  return (
    typeof value === "string" &&
    (ADDON_SERVICES as readonly string[]).includes(value)
  );
}

export function isBillingCycle(value: unknown): value is BillingCycle {
  return value === "monthly" || value === "yearly";
}

export function getPlan(id: string | null | undefined): Plan {
  const match = PLANS.find((plan) => plan.id === id);
  return match ?? FULL;
}

/** Monthly price of a plan, add-ons included. */
export function planMonthlyPrice(
  plan: PlanId,
  services: readonly ServiceId[] = [],
): number {
  if (plan === "full") return FULL_PRICE;
  return PARTIAL_PRICE + services.length * ADDON_PRICE;
}

/** What the customer is actually charged for one billing period. */
export function planPrice(
  plan: PlanId,
  services: readonly ServiceId[],
  billing: BillingCycle,
): number {
  const monthly = planMonthlyPrice(plan, services);
  return billing === "yearly" ? monthly * YEARLY_MONTHS_CHARGED : monthly;
}

/** Every service a plan unlocks, core services included. */
export function includedServices(
  plan: PlanId,
  services: readonly ServiceId[],
): AnyServiceId[] {
  if (plan === "full") return [...CORE_SERVICES, ...ADDON_SERVICES];
  return [...CORE_SERVICES, ...services];
}

/**
 * Whether a pass grants one service. An expired (or missing) pass grants
 * nothing: the shell shows the renewal screen in that case anyway.
 */
export function canUseService(
  plan: PlanId | null | undefined,
  services: readonly ServiceId[],
  service: AnyServiceId,
): boolean {
  if (!plan) return false;
  if (plan === "full") return true;
  if ((CORE_SERVICES as readonly string[]).includes(service)) return true;
  return (services as readonly string[]).includes(service);
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
