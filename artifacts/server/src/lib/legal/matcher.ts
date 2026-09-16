import { containsWord, normalizeText, sectorMatchTerms } from "@workspace/sectors";

/**
 * Decides whether a decree concerns a company, and why.
 *
 * Pure and dependency-free — no database, no model, no I/O — so the whole
 * "why did this alert appear?" question is answerable by reading this file.
 * That matters more than it looks: an alert a business owner cannot justify is
 * one they will learn to ignore, and the reason has to be the same data that
 * produced the score rather than a sentence written afterwards.
 *
 * The model's only input here is the `sectors` tags it chose from our closed
 * vocabulary. Everything else is a comparison.
 */

export interface CompanyProfile {
  sectorCode: string | null;
  legalForm: string | null;
  taxRegime: string | null;
}

/**
 * The subset of an extracted decree the matcher looks at.
 *
 * Structural rather than nominal: `ExtractedDecree` satisfies it, so callers
 * pass what they already have, and a test can pass a literal without building a
 * full extraction result.
 */
export interface MatchableDecree {
  titleFr: string | null;
  titleAr: string | null;
  summaryFr: string | null;
  summaryAr: string | null;
  topics: string[];
  sectors: string[];
  legalForms: string[];
  taxRegimes: string[];
}

export type Relevance = "HIGH" | "MEDIUM" | "LOW";

export interface MatchedOn {
  sectors: string[];
  keywords: string[];
  legalForm: boolean;
  taxRegime: boolean;
}

export interface MatchResult {
  score: number;
  relevance: Relevance;
  matchedOn: MatchedOn;
}

// ---------------------------------------------------------------- thresholds
// All tunable weights live here, so retuning relevance is one edit rather than
// a hunt. Scores are fractions of 1.

/** The company's declared sector appears in the decree's tags. */
const W_SECTOR = 0.5;
/** First sector keyword found in the text, and each one after it. */
const W_KEYWORD_FIRST = 0.25;
const W_KEYWORD_EXTRA = 0.05;
/** Ceiling on the keyword contribution, so a long text cannot carry a match alone. */
const W_KEYWORD_CAP = 0.3;
/** The decree names the company's legal form or its tax régime. */
const W_LEGAL_FORM = 0.1;
const W_TAX_REGIME = 0.1;
/**
 * A text that restricts nothing applies to every business, which is exactly why
 * it is hard to filter: it is genuinely relevant, but it carries no signal about
 * *this* company. It scores below any affirmative match and only counts when the
 * decree is also tagged with a topic that touches business generally.
 */
const W_UNIVERSAL = 0.35;

const HIGH_THRESHOLD = 0.6;
const MEDIUM_THRESHOLD = 0.35;
/** Below this a decree is stored in the corpus but raises no alert. */
export const MIN_ALERT_SCORE = 0.2;

/**
 * Topics that make an unrestricted decree worth surfacing to any business.
 *
 * Only consulted for decrees that restrict nothing — a text that already names
 * a sector, a legal form or a régime has a better reason to be shown. The list
 * is deliberately short and fiscal/social, because those are the changes a
 * small business owner is obliged to act on.
 *
 * Entries are normalised, so they are written the way `normalizeText` writes
 * them — unaccented and lowercase.
 */
const UNIVERSAL_TOPICS = [
  "fiscalite",
  "fiscal",
  "impot",
  "impots",
  "taxe",
  "taxes",
  "tva",
  "irg",
  "ifu",
  "g50",
  "g12",
  "comptabilite",
  "comptable",
  "social",
  "cnas",
  "casnos",
  "travail",
  "salarie",
  "salaires",
  "douane",
  "douanier",
  "entreprise",
  "entreprises",
  "investissement",
  "commerce",
  "registre de commerce",
].map(normalizeText);

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function bandFor(score: number): Relevance {
  if (score >= HIGH_THRESHOLD) return "HIGH";
  if (score >= MEDIUM_THRESHOLD) return "MEDIUM";
  return "LOW";
}

/**
 * Scores one decree against one company, or returns null when it does not
 * concern them at all.
 *
 * Null and a low score mean different things and are kept distinct: null is
 * "store the decree, raise no alert"; there is no path that stores an alert a
 * user would not be able to justify, because a score below `MIN_ALERT_SCORE`
 * requires no signal to have fired.
 */
export function matchDecree(
  decree: MatchableDecree,
  company: CompanyProfile,
): MatchResult | null {
  const matchedOn: MatchedOn = {
    sectors: [],
    keywords: [],
    legalForm: false,
    taxRegime: false,
  };
  let score = 0;

  // --- sector -------------------------------------------------------------
  // The strongest signal available, because it is the one the user declared
  // about themselves rather than one the model inferred.
  if (company.sectorCode && decree.sectors.includes(company.sectorCode)) {
    matchedOn.sectors = [company.sectorCode];
    score += W_SECTOR;
  }

  // --- keywords -----------------------------------------------------------
  // Scanned over the whole available text, both languages, because a decree
  // published in the French edition still carries its Arabic title.
  const haystack = normalizeText(
    [
      decree.titleFr,
      decree.titleAr,
      decree.summaryFr,
      decree.summaryAr,
    ]
      .filter(Boolean)
      .join(" "),
  );

  const terms = sectorMatchTerms(company.sectorCode);
  let keywordScore = 0;
  for (const term of terms) {
    if (!containsWord(haystack, term)) continue;
    matchedOn.keywords.push(term);
    keywordScore =
      keywordScore === 0
        ? W_KEYWORD_FIRST
        : Math.min(keywordScore + W_KEYWORD_EXTRA, W_KEYWORD_CAP);
  }
  score += keywordScore;

  // --- legal form ---------------------------------------------------------
  // An empty list means "applies to every form", which is not a match — it is
  // the absence of a restriction, handled below.
  if (
    company.legalForm &&
    decree.legalForms.length > 0 &&
    decree.legalForms.includes(company.legalForm)
  ) {
    matchedOn.legalForm = true;
    score += W_LEGAL_FORM;
  }

  // --- tax régime ---------------------------------------------------------
  if (
    company.taxRegime &&
    decree.taxRegimes.length > 0 &&
    decree.taxRegimes.includes(company.taxRegime)
  ) {
    matchedOn.taxRegime = true;
    score += W_TAX_REGIME;
  }

  // --- unrestricted but universally relevant -------------------------------
  const restrictsNothing =
    decree.sectors.length === 0 &&
    decree.legalForms.length === 0 &&
    decree.taxRegimes.length === 0;

  if (restrictsNothing && matchedOn.keywords.length === 0) {
    const topicHaystack = normalizeText(decree.topics.join(" "));
    const universal =
      topicHaystack !== "" &&
      UNIVERSAL_TOPICS.some((topic) => containsWord(topicHaystack, topic));
    if (universal) {
      matchedOn.keywords.push(...decree.topics.slice(0, 3));
      score += W_UNIVERSAL;
    }
  }

  score = clamp(score);
  if (score < MIN_ALERT_SCORE) return null;

  return { score: round3(score), relevance: bandFor(score), matchedOn };
}
