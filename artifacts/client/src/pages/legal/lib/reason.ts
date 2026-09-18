import { findSector, sectorLabelFor } from "@workspace/sectors";
import i18n from "@/i18n";
import type {
  LegalAlert,
  LegalAlertMatch,
  LegalAlertRelevance,
} from "@workspace/api-client-react";

/**
 * Turns a match into French a business owner can act on.
 *
 * This module exists because of the constraint the whole feature is built
 * around: **the user is not an accountant.** The database stores the reason as
 * structured signals — `{ sectors: ["COM_GROS"], keywords: ["douane"] }` — which
 * is exactly what makes the matching auditable, and exactly what must never
 * reach the screen. `COM_GROS` tells the user nothing; "Commerce de gros" tells
 * them why they are reading this.
 *
 * Keeping the translation here, as a pure function, is what lets the stored
 * reason stay machine-checkable while the displayed reason stays human. It is
 * also why the API returns structure rather than prose: the server cannot know
 * how the client phrases things, and a model-written justification would be
 * unauditable.
 */

/**
 * Severity in the user's terms rather than the schema's.
 *
 * "HIGH" reads as a system state; "Priorité élevée" reads as an instruction
 * about what to do with it.
 */
export function relevanceLabel(relevance: LegalAlertRelevance): string {
  return i18n.t(`legal.relevance.${relevance}`);
}

export interface AlertExplanation {
  /** The one-line answer to "why am I seeing this?" */
  headline: string;
  /** The specific signals behind it, each already human-readable. */
  details: string[];
}

const list = (items: string[]): string => items.join(", ");

/**
 * Explains a match, most-specific signal first.
 *
 * Order matters and is deliberate. A sector hit is the strongest thing we can
 * tell a user — it means the decree names their trade. The universal-topic
 * fallback (a finance law that restricts nothing, caught by its keywords) is the
 * weakest, and saying so is more honest than dressing it up: a user who sees
 * "peut vous concerner" on a tax law understands why it was surfaced, whereas
 * one shown a confident but generic claim learns to distrust the feed.
 */
export function explainMatch(match: LegalAlertMatch): AlertExplanation {
  const details: string[] = [];

  /**
   * Codes the catalogue cannot name are dropped rather than printed.
   *
   * `sectorLabelFor` falls back to the raw code, which is the right default for
   * an internal surface and the wrong one here — this module's entire contract
   * is that a code never reaches the screen. A documented code is validated
   * against the catalogue at extraction time, so this only bites when a later
   * catalogue version renames or removes a code an already-stored decree refers
   * to. Dropping it costs a little precision on a rare row; printing it would
   * show this user a token that means nothing to them.
   */
  const namedSectors = match.sectors.filter((code) => findSector(code));

  if (namedSectors.length > 0) {
    details.push(
      i18n.t("legal.match.sectors", {
        list: list(namedSectors.map(sectorLabelFor)),
      }),
    );
  }

  if (match.keywords.length > 0) {
    details.push(
      i18n.t("legal.match.keywords", { list: list(match.keywords) }),
    );
  }

  if (match.legalForm) {
    // The boolean says a restriction exists, not which form it names — the
    // company's own form is the only one worth stating, and the server does not
    // send it. A generic sentence is honest; naming a form would guess.
    details.push(i18n.t("legal.match.legalForm"));
  }

  if (match.taxRegime) {
    details.push(i18n.t("legal.match.taxRegime"));
  }

  // Based on the *named* sectors, not the raw ones: a row whose only sector
  // signal is an unresolvable code must fall through to the weaker headline
  // rather than claim a sector link it cannot name.
  const headline = namedSectors.length
    ? i18n.t("legal.match.headlineSector")
    : match.legalForm || match.taxRegime
      ? i18n.t("legal.match.headlineSituation")
      : i18n.t("legal.match.headlineGeneric");

  return { headline, details };
}

/**
 * The document as a heading: "Décret exécutif n° 25-225".
 *
 * Unlike the matcher's `kind`, which is an internal classification, this is
 * display text and follows the active language. The number is appended only when
 * there is one — plenty of texts (arrêtés, communications) genuinely have none,
 * and "n° undefined" is worse than silence.
 */
export function documentHeading(alert: LegalAlert): string {
  const kind = alert.docKind?.trim() || i18n.t("legal.textFallback");
  const number = alert.docNumber?.trim();
  return number ? i18n.t("legal.docHeading", { kind, number }) : kind;
}

/**
 * "Journal Officiel n° 88 de 2025", with the page when the extraction found one.
 *
 * This is the provenance line. It is not decoration: it is what lets a user —
 * or their accountant — go and read the original text.
 */
export function journalReference(alert: LegalAlert): string {
  const vars = { issue: alert.issueNumber, year: alert.year };
  return alert.pageFrom
    ? i18n.t("legal.journalRefPage", { ...vars, page: alert.pageFrom })
    : i18n.t("legal.journalRef", vars);
}
