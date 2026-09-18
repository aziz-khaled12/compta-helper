import { z } from "zod";
import i18n from "@/i18n";

/**
 * The legal forms offered by both the company page and the onboarding wizard.
 * Kept in one place so the two forms cannot drift apart again.
 */
export const LEGAL_FORMS = [
  "EURL",
  "SARL",
  "SNC",
  "SPA",
  "Personne Physique",
] as const;

export const legalFormSchema = z.enum(LEGAL_FORMS);

/**
 * The two Algerian tax systems. This is a declaration the company makes, not
 * something the app derives — it is what decides which fiscal return the
 * reports page offers (G12 under the forfaitaire, G50 under the réel).
 *
 * Values must match the `taxRegime` enum in `openapi.yaml`; both forms import
 * this list so they cannot drift apart.
 */
export const TAX_REGIMES = ["FORFAITAIRE", "REEL"] as const;

export const taxRegimeSchema = z.enum(TAX_REGIMES);

export type TaxRegimeValue = z.infer<typeof taxRegimeSchema>;

/** Display label for a tax regime, in the active language. */
export function taxRegimeLabel(regime: TaxRegimeValue): string {
  return i18n.t(`consts.taxRegime.${regime}`);
}

/** One-line explanation of what a regime files, in the active language. */
export function taxRegimeHint(regime: TaxRegimeValue): string {
  return i18n.t(`consts.taxRegime.${regime}.hint`);
}

/**
 * Display label for a stored legal form. Abbreviations (EURL, SARL, SNC, SPA)
 * are left verbatim in every language; "Personne Physique" — the one form that
 * is a full phrase — is translated. The stored values stay unchanged: the legal
 * crawler matches `docs.legal_forms` against the exact string.
 */
export function legalFormLabel(form: string | null | undefined): string {
  if (!form) return "";
  const constKey = form === "Personne Physique" ? "PERSONNE_PHYSIQUE" : form;
  return i18n.t(`consts.legalForm.${constKey}`);
}

export const fundingSchema = z.object({
  source: z.enum(["OWN_FUNDS", "BANK_LOAN"]),
  label: z.string().optional(),
  amount: z.coerce.number().min(1, "Le montant doit être positif"),
  date: z.string(),
  interestRate: z.coerce.number().optional(),
  durationMonths: z.coerce.number().optional(),
});

export type FundingValues = z.infer<typeof fundingSchema>;

/** Display label for a funding source, in the active language. */
export function fundingSourceLabel(
  source: FundingValues["source"],
): string {
  return i18n.t(`consts.funding.source.${source}`);
}
