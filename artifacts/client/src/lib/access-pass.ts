/**
 * The subscription pass that unlocks login, registration and — service by
 * service — the authenticated app.
 *
 * This is the demo checkout, NOT a server entitlement check: the API knows
 * nothing about it, so clearing site data simply re-opens the gate. A real
 * product would verify the subscription server-side before issuing a session.
 *
 * The pass lives in `localStorage` rather than `sessionStorage` on purpose:
 * paying must survive a refresh, or the user would be asked to pay again right
 * after the redirect from the checkout.
 */
import {
  ADDON_SERVICES,
  TRIAL_DAYS,
  isBillingCycle,
  isPlanId,
  isServiceId,
  type BillingCycle,
  type PlanId,
  type ServiceId,
} from "./plans";

const STORAGE_KEY = "compta-helper.access-pass";
const TRIAL_KEY = "compta-helper.trial-used";

/** Same-tab notification: `storage` only fires in *other* tabs. */
export const PASS_CHANGE_EVENT = "compta-helper:pass-changed";

const DAY_MS = 24 * 60 * 60 * 1000;

export type AccessPass = {
  /** Human-readable receipt id, e.g. `CH-7K2QX9`. */
  reference: string;
  plan: PlanId;
  /** Add-ons bought on top of the partial pack; always empty for `full`. */
  services: ServiceId[];
  billing: BillingCycle;
  /** Total charged so far, in DA. Add-ons are added to this figure. */
  amount: number;
  /** Last four digits of the (simulated) card; empty for a trial. */
  cardLast4: string;
  paidAt: string;
  expiresAt: string;
  /** `true` for the 7-day full-pack trial — no card, no charge. */
  trial?: boolean;
};

type LegacyBundleId = "essential" | "pro" | "enterprise";

/** What the old three-bundle ladder means under the two-pack model. */
const LEGACY_BUNDLE_PLANS: Record<LegacyBundleId, PlanId> = {
  essential: "partial",
  pro: "full",
  enterprise: "full",
};

/**
 * Read a stored pass, accepting the pre-two-pack shape. Old payloads carry
 * `bundleId` instead of `plan`; without this, every existing device would be
 * bounced back to the pricing page after the launch.
 */
function normalizePass(value: unknown): AccessPass | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;

  if (
    typeof raw.reference !== "string" ||
    typeof raw.amount !== "number" ||
    typeof raw.cardLast4 !== "string" ||
    typeof raw.paidAt !== "string" ||
    typeof raw.expiresAt !== "string" ||
    !isBillingCycle(raw.billing)
  ) {
    return null;
  }

  let plan: PlanId | null = isPlanId(raw.plan) ? raw.plan : null;
  if (!plan && typeof raw.bundleId === "string") {
    plan = LEGACY_BUNDLE_PLANS[raw.bundleId as LegacyBundleId] ?? null;
  }
  if (!plan) return null;

  const services: ServiceId[] = Array.isArray(raw.services)
    ? [...new Set(raw.services.filter(isServiceId))]
    : [];

  return {
    reference: raw.reference,
    plan,
    // The full pack stores no add-ons: it grants everything implicitly.
    services: plan === "full" ? [] : services,
    billing: raw.billing,
    amount: raw.amount,
    cardLast4: raw.cardLast4,
    paidAt: raw.paidAt,
    expiresAt: raw.expiresAt,
    ...(raw.trial === true ? { trial: true as const } : {}),
  };
}

function notifyPassChanged(): void {
  try {
    window.dispatchEvent(new Event(PASS_CHANGE_EVENT));
  } catch {
    // No window (SSR/tests): nothing listens anyway.
  }
}

/** Storage can throw (private mode, disabled cookies) — never break the page. */
export function readAccessPass(): AccessPass | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    return normalizePass(parsed);
  } catch {
    return null;
  }
}

export function saveAccessPass(pass: AccessPass): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pass));
  } catch {
    // The in-memory pass still lets this session continue.
  }
  notifyPassChanged();
}

export function clearAccessPass(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do: the pass was not readable in the first place.
  }
  notifyPassChanged();
}

export function isAccessPassActive(
  pass: AccessPass | null,
  now: Date = new Date(),
): pass is AccessPass {
  return pass !== null && new Date(pass.expiresAt).getTime() > now.getTime();
}

export function isTrialPass(pass: AccessPass | null): boolean {
  return pass !== null && pass.trial === true;
}

/** Whole days left on the pass, never negative. */
export function daysLeft(pass: AccessPass, now: Date = new Date()): number {
  const remaining = new Date(pass.expiresAt).getTime() - now.getTime();
  return Math.max(0, Math.ceil(remaining / DAY_MS));
}

/** Receipt id for the demo checkout, e.g. `CH-7K2QX9`. */
export function createPassReference(): string {
  // No 0/O/1/I: a reference is read over the phone as often as it is copied.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let index = 0; index < 6; index += 1) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `CH-${suffix}`;
}

/** One billing period after `start`, counted in whole months. */
export function billingExpiry(start: Date, billing: BillingCycle): Date {
  const expiry = new Date(start.getTime());
  expiry.setMonth(expiry.getMonth() + (billing === "yearly" ? 12 : 1));
  return expiry;
}

/** A paid subscription starting now — used by the checkout and by renewals. */
export function createPass(
  options: {
    plan: PlanId;
    services: ServiceId[];
    billing: BillingCycle;
    amount: number;
    cardLast4: string;
  },
  now: Date = new Date(),
): AccessPass {
  return {
    reference: createPassReference(),
    plan: options.plan,
    services: options.plan === "full" ? [] : [...new Set(options.services)],
    billing: options.billing,
    amount: options.amount,
    cardLast4: options.cardLast4,
    paidAt: now.toISOString(),
    expiresAt: billingExpiry(now, options.billing).toISOString(),
  };
}

/**
 * Add paid services to a running partial pack. The period is untouched: the
 * add-on is charged flat, with no proration, and expires with the pass.
 */
export function addServices(
  pass: AccessPass,
  services: readonly ServiceId[],
  amount: number,
): AccessPass {
  const merged = [...new Set([...pass.services, ...services])].filter((id) =>
    (ADDON_SERVICES as readonly string[]).includes(id),
  ) as ServiceId[];

  return { ...pass, services: merged, amount: pass.amount + amount };
}

/** `true` once this device has started its one free trial. */
export function hasUsedTrial(): boolean {
  try {
    return window.localStorage.getItem(TRIAL_KEY) === "1";
  } catch {
    return false;
  }
}

function markTrialUsed(): void {
  try {
    window.localStorage.setItem(TRIAL_KEY, "1");
  } catch {
    // Worst case: the trial can be restarted on a device that blocks storage.
  }
}

/**
 * Start the one free week of the full pack: seven days, no card, every service
 * unlocked. The marker is separate from the pass so an expired trial does not
 * become a renewable one.
 */
export function startTrial(now: Date = new Date()): AccessPass {
  const pass: AccessPass = {
    reference: createPassReference(),
    plan: "full",
    services: [],
    billing: "monthly",
    amount: 0,
    cardLast4: "",
    paidAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + TRIAL_DAYS * DAY_MS).toISOString(),
    trial: true,
  };

  saveAccessPass(pass);
  markTrialUsed();
  return pass;
}

/** `19/12/2026` in both locales — the app formats dates as fr-DZ throughout. */
export function formatPassDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("fr-DZ");
}
