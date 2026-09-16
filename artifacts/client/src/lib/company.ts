import { z } from "zod";

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

export const TAX_REGIME_LABELS: Record<TaxRegimeValue, string> = {
  FORFAITAIRE: "Régime forfaitaire (IFU) — النظام الجزافي",
  REEL: "Régime réel — النظام الحقيقي",
};

export const TAX_REGIME_HINTS: Record<TaxRegimeValue, string> = {
  FORFAITAIRE: "Déclaration prévisionnelle du chiffre d'affaires — G12.",
  REEL: "Bordereau mensuel avis de versement — G50.",
};

export const fundingSchema = z.object({
  source: z.enum(["OWN_FUNDS", "BANK_LOAN"]),
  label: z.string().optional(),
  amount: z.coerce.number().min(1, "Le montant doit être positif"),
  date: z.string(),
  interestRate: z.coerce.number().optional(),
  durationMonths: z.coerce.number().optional(),
});

export type FundingValues = z.infer<typeof fundingSchema>;

export const FUNDING_SOURCE_LABELS: Record<FundingValues["source"], string> = {
  OWN_FUNDS: "Apport / Capital",
  BANK_LOAN: "Emprunt Bancaire",
};
