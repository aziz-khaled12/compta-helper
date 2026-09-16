import type { TaxRegimeValue } from "@/lib/company";
import {
  fmt,
  inRange,
  rangeEnd,
  rangeStart,
  type TxRow,
} from "@/lib/ledger";

/**
 * Algerian tax rules, in one place.
 *
 * A company is placed under one of two systems, and each files a different
 * fiscal return:
 *
 *   - **Forfaitaire** (النظام الجزافي) — the single flat tax, IFU. Files the
 *     **G12**, one annual déclaration prévisionnelle du chiffre d'affaires.
 *   - **Réel** (النظام الحقيقي) — files the **G50**, the monthly
 *     *bordereau avis de versement*.
 *
 * The two are mutually exclusive: a company files the G12 **or** the G50.
 *
 * The system is **declared on the company's own record** (`companies.taxRegime`)
 * and that declaration is authoritative here. The rules below are kept only as
 * a fallback for companies that predate the field, and to flag a declaration
 * that is legally impossible.
 */

/** Turnover ceiling of the forfaitaire (IFU) system, in dinars. */
export const IFU_CEILING = 8_000_000;

/**
 * Minimum d'imposition IFU, in dinars. The IFU due is the greater of the
 * turnover times the applicable rate and this floor.
 *
 * ⚠ Confirm this figure against the current DGI text before relying on it — the
 * 10 000 DA floor has been amended before, and it is the only number in this
 * file that is not derived from the company's own books.
 */
export const IFU_MINIMUM = 10_000;

const PERSONNE_PHYSIQUE = "Personne Physique";
const PERSONNES_MORALES: readonly string[] = ["EURL", "SARL", "SNC", "SPA"];

/** The three IFU rate lines, as they appear on the G12. */
export const IFU_RATES = [
  { id: "marchandises", rate: 0.05, label: "Ventes de marchandises" },
  { id: "services", rate: 0.12, label: "Prestations de services" },
  { id: "auto", rate: 0.005, label: "Auto-entrepreneur" },
] as const;

/** Matches the `taxRegime` enum in openapi.yaml and `src/lib/company.ts`. */
export type TaxRegime = TaxRegimeValue;
export type FiscalReportId = "g12" | "g50";

/** The return each system files. */
export const FISCAL_REPORT_BY_REGIME: Record<TaxRegime, FiscalReportId> = {
  FORFAITAIRE: "g12",
  REEL: "g50",
};

/** Where the turnover behind a decision was read from. */
export type TurnoverBasis = "N-1" | "PERIODE";

export interface ReportEligibility {
  regime: TaxRegime;
  /** True when `regime` came from the company's record rather than the fallback. */
  declared: boolean;
  /** The one fiscal return this company files. */
  fiscalReportId: FiscalReportId;
  /** The rule or declaration behind `regime`, ready to display. */
  reason: string;
  turnover: number;
  basis: TurnoverBasis;
  /** e.g. "exercice précédent (2025)" — what `turnover` was read from. */
  basisLabel: string;
  /** Fiscal returns that do not apply, mapped to the rule that excluded them. */
  disabled: Partial<Record<string, string>>;
  /** A declared system the law does not allow, if any. */
  warning: string | null;
  /** What the books cannot resolve, and that the user must therefore decide. */
  note: string;
}

/**
 * The app records no activity or sector for a company, so it cannot evaluate
 * the IFU exclusion list, nor allocate turnover across the three rate lines.
 */
const ACTIVITY_NOTE =
  "L'activité de l'entreprise n'est pas enregistrée : les activités exclues de l'IFU (import-revente, commerce de gros, cliniques, hôtels classés, travaux publics, professions libérales…) relèvent du régime réel même sous le plafond, et la répartition du chiffre d'affaires entre les lignes 5 % / 12 % / 0,5 % reste à indiquer.";

/** Turnover (HT) on sales dated inside a calendar year, and how many there were. */
export function salesInYear(txns: TxRow[], year: number) {
  const sales = txns.filter(
    (t) => t.type === "SALE" && inRange(t.date, rangeStart(year, 1), rangeEnd(year, 12)),
  );
  return {
    total: sales.reduce((s, t) => s + t.amountHt, 0),
    count: sales.length,
  };
}

/** Turnover (HT) on sales dated inside an arbitrary range. */
export function salesInRange(txns: TxRow[], from: Date, to: Date): number {
  return txns
    .filter((t) => t.type === "SALE" && inRange(t.date, from, to))
    .reduce((s, t) => s + t.amountHt, 0);
}

/**
 * The system the company's profile implies, used only when none is declared and
 * to sanity-check one that is.
 *
 * Régime réel is the residual system: a taxpayer is réel unless it qualifies for
 * the forfait, and qualifying needs a personne-physique form it has declared.
 * So an unrecorded `legalForm` resolves to réel rather than to a guess.
 */
export function determineRegime(
  legalForm: string | null | undefined,
  turnover: number,
  basisLabel: string,
): { regime: TaxRegime; reason: string } {
  if (legalForm && PERSONNES_MORALES.includes(legalForm)) {
    return {
      regime: "REEL",
      reason: `personne morale — régime réel quel que soit le chiffre d'affaires (CA ${basisLabel} : ${fmt(turnover)})`,
    };
  }
  if (legalForm === PERSONNE_PHYSIQUE) {
    return turnover <= IFU_CEILING
      ? {
          regime: "FORFAITAIRE",
          reason: `personne physique — CA ${basisLabel} : ${fmt(turnover)}, sous le plafond IFU de ${fmt(IFU_CEILING)}`,
        }
      : {
          regime: "REEL",
          reason: `personne physique — CA ${basisLabel} : ${fmt(turnover)}, au-dessus du plafond IFU de ${fmt(IFU_CEILING)}`,
        };
  }
  return {
    regime: "REEL",
    reason: `forme juridique non renseignée — régime réel par défaut (CA ${basisLabel} : ${fmt(turnover)})`,
  };
}

/**
 * A declared forfait that the law does not permit. Régime réel is always
 * allowed — a taxpayer under the ceiling can legitimately be réel, e.g. through
 * an activity excluded from the IFU — so only the forfait direction is checked.
 */
function declaredConflict(
  legalForm: string | null | undefined,
  declared: TaxRegime | null | undefined,
  derived: TaxRegime,
  turnover: number,
  basisLabel: string,
): string | null {
  if (!declared || declared === derived || declared !== "FORFAITAIRE") return null;
  if (legalForm && PERSONNES_MORALES.includes(legalForm)) {
    return "Incohérence : une personne morale ne peut pas relever du régime forfaitaire, les sociétés étant soumises au régime réel quel que soit leur chiffre d'affaires.";
  }
  return `Incohérence : le chiffre d'affaires ${basisLabel} (${fmt(turnover)}) dépasse le plafond du régime forfaitaire de ${fmt(IFU_CEILING)}.`;
}

/**
 * Which fiscal returns this company may file.
 *
 * The declared `taxRegime` decides. The rules in `determineRegime` are used only
 * when nothing is declared, and to flag a declaration the law does not allow.
 *
 * The turnover shown alongside it follows N-1, since that is the year the DGI
 * reads to place a company; a company with no sales in N-1 at all falls back to
 * the selected period, and `basis` records which was used so the UI never
 * presents a proxy as if it were the real basis.
 */
export function getReportEligibility(
  legalForm: string | null | undefined,
  declaredRegime: TaxRegime | null | undefined,
  txns: TxRow[],
  reportYear: number,
  from: Date,
  to: Date,
): ReportEligibility {
  const previousYear = salesInYear(txns, reportYear - 1);
  const basis: TurnoverBasis = previousYear.count > 0 ? "N-1" : "PERIODE";
  const turnover =
    basis === "N-1" ? previousYear.total : salesInRange(txns, from, to);
  const basisLabel =
    basis === "N-1"
      ? `exercice précédent (${reportYear - 1})`
      : `période sélectionnée (${reportYear})`;

  const derived = determineRegime(legalForm, turnover, basisLabel);
  const regime = declaredRegime ?? derived.regime;
  const reason = declaredRegime
    ? `système fiscal déclaré sur la fiche entreprise — ${
        regime === "FORFAITAIRE" ? "régime forfaitaire" : "régime réel"
      }`
    : derived.reason;

  // The inapplicable return is the other system's, so the same reason explains
  // both directions: why this company files the one it does.
  const inapplicable: FiscalReportId = regime === "FORFAITAIRE" ? "g50" : "g12";

  return {
    regime,
    declared: !!declaredRegime,
    fiscalReportId: FISCAL_REPORT_BY_REGIME[regime],
    reason,
    turnover,
    basis,
    basisLabel,
    disabled: { [inapplicable]: `Non applicable — ${reason}.` },
    warning: declaredConflict(legalForm, declaredRegime, derived.regime, turnover, basisLabel),
    note: ACTIVITY_NOTE,
  };
}

/** IFU due on a turnover, at one of the `IFU_RATES` lines, floored at the minimum. */
export function computeIfuDue(turnover: number, rate: number): number {
  return Math.max(turnover * rate, IFU_MINIMUM);
}
