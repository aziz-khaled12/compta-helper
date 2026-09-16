import { z } from "zod";
import { fundingSchema, legalFormSchema, taxRegimeSchema } from "@/lib/company";

export const step1Schema = z.object({
  name: z.string().min(2, "Nom requis"),
  nif: z.string().min(3, "NIF requis"),
  ai: z.string().min(3, "AI requis"),
  address: z.string().optional(),
  legalForm: legalFormSchema.optional(),
  taxRegime: taxRegimeSchema.optional(),
  // Optional keeps drafts saved before this field existed parseable, so the
  // stored `version` does not need bumping.
  sectorCode: z.string().nullable().optional(),
});

/** Capital rows share the company page's schema so the two cannot drift. */
export const fundingEntrySchema = fundingSchema;

export const assetSchema = z.object({
  label: z.string().min(2),
  category: z.string().min(1),
  costHt: z.coerce.number().positive(),
  purchaseDate: z.string().min(10),
  lifeYears: z.coerce.number().int().positive(),
  residualValue: z.coerce.number().min(0),
});

export const inventorySchema = z.object({
  name: z.string().min(2),
  category: z.enum(["RAW_MATERIAL", "FINISHED_GOOD", "SUPPLY"]),
  unit: z.string().min(1),
  initialQty: z.coerce.number().positive(),
  unitCostHt: z.coerce.number().positive(),
});

/**
 * These must match EmployeeInput.familySituation in openapi.yaml exactly —
 * `MARRIED_1` is not a value the API accepts, and sending it fails the whole
 * request with a 400.
 */
export const employeeSchema = z.object({
  fullName: z.string().min(2),
  position: z.string().min(2),
  familySituation: z.enum([
    "SINGLE",
    "MARRIED",
    "MARRIED_1_CHILD",
    "MARRIED_2_CHILDREN",
    "MARRIED_3_CHILDREN",
    "MARRIED_4_PLUS_CHILDREN",
  ]),
  baseSalary: z.coerce.number().positive(),
  experienceYears: z.coerce.number().int().min(0),
  hireDate: z.string().min(10),
});

export type Step1Data = z.infer<typeof step1Schema>;
export type FundingData = z.infer<typeof fundingEntrySchema>;
export type AssetData = z.infer<typeof assetSchema>;
export type InventoryData = z.infer<typeof inventorySchema>;
export type EmployeeData = z.infer<typeof employeeSchema>;

export const FAMILY_SITUATION_LABELS: Record<
  EmployeeData["familySituation"],
  string
> = {
  SINGLE: "Célibataire",
  MARRIED: "Marié(e) sans enfant",
  MARRIED_1_CHILD: "Marié(e) + 1 enfant",
  MARRIED_2_CHILDREN: "Marié(e) + 2 enfants",
  MARRIED_3_CHILDREN: "Marié(e) + 3 enfants",
  MARRIED_4_PLUS_CHILDREN: "Marié(e) + 4 enfants et plus",
};

export const INVENTORY_CATEGORY_LABELS: Record<
  InventoryData["category"],
  string
> = {
  RAW_MATERIAL: "Matière première",
  FINISHED_GOOD: "Produit fini",
  SUPPLY: "Fourniture",
};

/**
 * Submission runs in this order and is recorded as it goes, so retrying after a
 * failure resumes rather than re-creating everything that already succeeded.
 */
export const ONBOARDING_PHASES = [
  "company",
  "funding",
  "assets",
  "inventory",
  "employees",
] as const;

export type OnboardingPhase = (typeof ONBOARDING_PHASES)[number];

/** Bumping the version invalidates any draft left over from an older shape. */
export const DRAFT_STORAGE_KEY = "djerdjera.onboarding.draft.v1";
export const DRAFT_VERSION = 1;

export const onboardingDraftSchema = z.object({
  version: z.literal(DRAFT_VERSION),
  step: z.number().int().min(1).max(4),
  company: step1Schema.nullable(),
  funding: z.array(fundingEntrySchema),
  assets: z.array(assetSchema),
  inventory: z.array(inventorySchema),
  employees: z.array(employeeSchema),
  completedPhases: z.array(z.enum(ONBOARDING_PHASES)).default([]),
});

export type OnboardingDraft = z.infer<typeof onboardingDraftSchema>;
