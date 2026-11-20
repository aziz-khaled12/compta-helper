/**
 * The subscription pass that unlocks login and registration.
 *
 * This is the demo checkout, NOT an entitlement check: the API knows nothing
 * about it, so clearing site data simply re-opens the gate. A real product
 * would verify the subscription server-side before issuing a session.
 *
 * The pass lives in `localStorage` rather than `sessionStorage` on purpose:
 * paying must survive a refresh, or the user would be asked to pay again right
 * after the redirect from the checkout.
 */
import {
  isBillingCycle,
  isBundleId,
  type BillingCycle,
  type BundleId,
} from "./bundles";

const STORAGE_KEY = "compta-helper.access-pass";

export type AccessPass = {
  /** Human-readable receipt id, e.g. `CH-7K2QX9`. */
  reference: string;
  bundleId: BundleId;
  billing: BillingCycle;
  /** Charged amount, in DA. */
  amount: number;
  /** Last four digits of the (simulated) card. */
  cardLast4: string;
  paidAt: string;
  expiresAt: string;
};

function isAccessPass(value: unknown): value is AccessPass {
  if (typeof value !== "object" || value === null) return false;
  const pass = value as Record<string, unknown>;

  return (
    typeof pass.reference === "string" &&
    isBundleId(pass.bundleId) &&
    isBillingCycle(pass.billing) &&
    typeof pass.amount === "number" &&
    typeof pass.cardLast4 === "string" &&
    typeof pass.paidAt === "string" &&
    typeof pass.expiresAt === "string"
  );
}

/** Storage can throw (private mode, disabled cookies) — never break the page. */
export function readAccessPass(): AccessPass | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    return isAccessPass(parsed) ? parsed : null;
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
}

export function clearAccessPass(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do: the pass was not readable in the first place.
  }
}

export function isAccessPassActive(
  pass: AccessPass | null,
  now: Date = new Date(),
): pass is AccessPass {
  return pass !== null && new Date(pass.expiresAt).getTime() > now.getTime();
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

/** `19/12/2026` in both locales — the app formats dates as fr-DZ throughout. */
export function formatPassDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("fr-DZ");
}
