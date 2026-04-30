/**
 * Algerian payroll calculations.
 *
 * - Prime d'ancienneté (experience bonus): 2% of base per year, capped at 25 years (50% max).
 * - CNAS (Caisse Nationale d'Assurance Sociale): 9% of gross salary (employee share).
 * - IRG (Impôt sur le Revenu Global): progressive monthly scale (Algerian 2022 reform values),
 *   with a child abatement applied to the calculated tax.
 *
 * Family-situation child abatements (applied to monthly IRG):
 *   SINGLE / MARRIED                   -> 0%
 *   MARRIED_1_CHILD                    -> 5%
 *   MARRIED_2_CHILDREN                 -> 10%
 *   MARRIED_3_CHILDREN                 -> 15%
 *   MARRIED_4_PLUS_CHILDREN            -> 20%
 *
 * IRG monthly brackets (DA):
 *   0      - 30,000   ->  0%
 *   30,001 - 35,000   -> 23%
 *   35,001 - 70,000   -> 27%
 *   70,001 - 140,000  -> 30%
 *  140,001+           -> 35%
 *
 * These figures are commonly used in Algerian payroll software and produce
 * realistic monthly net amounts for the small-business case.
 */

export type FamilySituation =
  | "SINGLE"
  | "MARRIED"
  | "MARRIED_1_CHILD"
  | "MARRIED_2_CHILDREN"
  | "MARRIED_3_CHILDREN"
  | "MARRIED_4_PLUS_CHILDREN";

export const CNAS_RATE = 0.09;

export function computeExperienceBonus(
  baseSalary: number,
  experienceYears: number,
): number {
  const years = Math.max(0, Math.min(25, experienceYears));
  return baseSalary * (years * 0.02);
}

const CHILD_ABATEMENT: Record<FamilySituation, number> = {
  SINGLE: 0,
  MARRIED: 0,
  MARRIED_1_CHILD: 0.05,
  MARRIED_2_CHILDREN: 0.1,
  MARRIED_3_CHILDREN: 0.15,
  MARRIED_4_PLUS_CHILDREN: 0.2,
};

const IRG_BRACKETS: Array<{ upTo: number; rate: number }> = [
  { upTo: 30_000, rate: 0 },
  { upTo: 35_000, rate: 0.23 },
  { upTo: 70_000, rate: 0.27 },
  { upTo: 140_000, rate: 0.3 },
  { upTo: Number.POSITIVE_INFINITY, rate: 0.35 },
];

export function computeIrg(
  taxableBase: number,
  familySituation: FamilySituation,
): number {
  if (taxableBase <= 0) return 0;
  let remaining = taxableBase;
  let prevCap = 0;
  let tax = 0;
  for (const bracket of IRG_BRACKETS) {
    const slice = Math.min(remaining, bracket.upTo - prevCap);
    if (slice <= 0) break;
    tax += slice * bracket.rate;
    remaining -= slice;
    prevCap = bracket.upTo;
    if (remaining <= 0) break;
  }
  const abatement = CHILD_ABATEMENT[familySituation] ?? 0;
  const adjusted = tax * (1 - abatement);
  return Math.max(0, adjusted);
}

export interface PayrollCalculation {
  baseSalary: number;
  experienceBonus: number;
  bonus: number;
  grossSalary: number;
  cnasDeduction: number;
  taxableBase: number;
  irgDeduction: number;
  netToPay: number;
}

export function computePayroll(input: {
  baseSalary: number;
  experienceYears: number;
  familySituation: FamilySituation;
  bonus?: number;
}): PayrollCalculation {
  const { baseSalary, experienceYears, familySituation, bonus = 0 } = input;
  const experienceBonus = computeExperienceBonus(baseSalary, experienceYears);
  const grossSalary = baseSalary + experienceBonus + bonus;
  const cnasDeduction = grossSalary * CNAS_RATE;
  const taxableBase = grossSalary - cnasDeduction;
  const irgDeduction = computeIrg(taxableBase, familySituation);
  const netToPay = taxableBase - irgDeduction;
  return {
    baseSalary,
    experienceBonus,
    bonus,
    grossSalary,
    cnasDeduction,
    taxableBase,
    irgDeduction,
    netToPay,
  };
}
