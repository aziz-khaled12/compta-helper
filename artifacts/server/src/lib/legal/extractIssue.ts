import { Type } from "@google/genai";
import { SECTORS, normalizeText, sectorCodes } from "@workspace/sectors";
import { generateJson } from "../gemini/client";
import type { Edition } from "./joradp";

/**
 * Turns one issue PDF into structured decrees.
 *
 * The model extracts and tags; it never decides relevance. Every decree comes
 * back tagged with codes from a *closed* vocabulary, and `matcher.ts` then does
 * a set intersection in TypeScript. That split is what makes "why does this
 * text concern me?" answerable with a specific, auditable reason rather than a
 * plausible sentence the model invented.
 */

/** The legal-form values the company table already uses. */
const LEGAL_FORMS = ["EURL", "SARL", "SNC", "SPA", "Personne Physique"] as const;

/** The tax régimes the company table already uses. */
const TAX_REGIMES = ["FORFAITAIRE", "REEL"] as const;

export interface ExtractedDecree {
  kind: string;
  number: string | null;
  titleFr: string | null;
  titleAr: string | null;
  summaryFr: string | null;
  summaryAr: string | null;
  /** ISO `YYYY-MM-DD`, or null when the text carries no date. */
  publishedOn: string | null;
  pageFrom: number | null;
  topics: string[];
  sectors: string[];
  legalForms: string[];
  taxRegimes: string[];
  confidence: number | null;
}

export interface ExtractedIssue {
  publishedOn: string | null;
  decrees: ExtractedDecree[];
}

/**
 * The sector vocabulary, rendered once as a stable block of text.
 *
 * It is passed as the *system instruction* rather than as part of the prompt so
 * that it stays byte-identical across every call. Gemini caches a repeated
 * prefix, so this ~1k-token block is paid for once per session rather than on
 * each of the ~176 issues in a full-year backfill.
 *
 * Labels and descriptions are included alongside the codes because a bare code
 * like `COM_GROS` tells the model nothing — it would be tagging on the shape of
 * the string. The description is what lets it recognise a wholesale-trade
 * decree.
 */
const SECTOR_VOCABULARY = SECTORS.filter((s) => s.keywords.length > 0)
  .map((s) => `- ${s.code} : ${s.label} — ${s.description}`)
  .join("\n");

/**
 * Pinned deliberately, and the pinning is the point.
 *
 * Extraction completeness is strongly prompt-sensitive: the same French PDF
 * yielded **6** decrees under a prompt that enumerated the document types to
 * look for, and **40** under a broader instruction. Enumerating types reads as
 * a closed list, and the model then silently treats anything not on it as out
 * of scope. So this prompt describes the *test* (does the text have normative
 * effect?) and gives types only as non-exhaustive examples.
 *
 * Recall is worth more than precision here, because the matcher is the filter.
 * A decree that is extracted but irrelevant costs one row and is dropped by the
 * matcher; a decree that is never extracted cannot be recovered.
 */
const EXTRACTION_RULES = `Tu extrais les textes d'un numéro du Journal Officiel algérien (JORADP) pour alimenter des alertes juridiques destinées à des dirigeants de petites entreprises. Tu n'écris pas de résumé du journal : tu énumères chaque texte qu'il contient.

RÈGLE D'INCLUSION — retiens tout texte ayant un effet normatif, c'est-à-dire qui crée, modifie ou supprime une règle, ou qui fixe un taux, un seuil, une obligation, une procédure ou une échéance. Cela comprend notamment : lois, ordonnances, décrets (présidentiels, exécutifs, législatifs), arrêtés (ministériels, interministériels), décisions, délibérations, circulaires, conventions, avenants et statuts.

Ces types ne sont que des exemples : la liste n'est pas limitative. Un texte qui impose une obligation aux entreprises sans appartenir à l'une de ces catégories doit être extrait.

NE retiens PAS : les nominations individuelles, les distinctions honorifiques, les avis de concours, les élections de chambres, l'état civil, les remises de décorations et les errata purement typographiques.

Pour chaque texte retenu :
- "kind" : le type TOUJOURS EN FRANÇAIS, même dans l'édition arabe (par exemple "Décret exécutif", "Arrêté interministériel", "Ordonnance"). C'est une classification interne, pas un texte à afficher : "مرسوم تنفيذي" doit donner "Décret exécutif".
- "number" : le numéro du texte s'il en a un, sinon la chaîne vide. Recopie les chiffres tels quels.
- "titleFr" : le titre complet en français. S'il est déjà en français, recopie-le tel quel. S'il est en arabe, traduis-le en français. Ce champ est TOUJOURS rempli.
- "titleAr" : le titre complet en arabe, tel qu'il figure dans le document. Chaîne vide si le document est en français.
- "summaryFr" : UNE phrase en français expliquant ce que le texte change concrètement, compréhensible par un dirigeant non juriste. TOUJOURS rempli, y compris pour l'édition arabe.
- "summaryAr" : la même phrase en arabe. Chaîne vide en édition française.
- "publishedOn" : la date de publication du texte au format AAAA-MM-JJ, ou chaîne vide si absente.
- "pageFrom" : le numéro de la première page du texte, ou 0 si inconnu.
- "topics" : 0 à 5 mots-clés thématiques libres en français (par exemple "fiscalité", "TVA", "douane", "travail", "environnement").
- "sectors" : les codes de secteurs concernés, choisis UNIQUEMENT dans la liste ci-dessous. Laisse le tableau vide si le texte s'applique à toutes les entreprises ou à aucune en particulier — c'est le cas le plus fréquent pour les textes fiscaux et sociaux.
- "legalForms" : parmi ${LEGAL_FORMS.join(", ")}. Tableau vide si le texte s'applique à toutes les formes juridiques.
- "taxRegimes" : parmi ${TAX_REGIMES.join(", ")}. Tableau vide si le texte s'applique aux deux régimes.
- "confidence" : ta confiance dans cette extraction, entre 0 et 1.

VOCABULAIRE DES SECTEURS — n'invente jamais un code qui n'est pas dans cette liste :
${SECTOR_VOCABULARY}`;

/** Gemini's schema dialect has no nullable, so absent values come back as "". */
const nullIfEmpty = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

const numberOrNull = (value: unknown): number | null => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * Keeps only codes the catalogue actually defines.
 *
 * The response schema constrains `sectors` to an enum, but a schema is a
 * request, not a guarantee, and a hallucinated code would sit in the database
 * looking authoritative while matching nothing. Filtering here means the column
 * can be trusted by the matcher without re-validating.
 */
const knownSectors = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const valid = new Set(sectorCodes());
  return [...new Set(value.filter((v): v is string => typeof v === "string" && valid.has(v)))];
};

/**
 * Arabic-Indic (U+0660–U+0669) and Extended Arabic-Indic (U+06F0–U+06F9) digits
 * folded to ASCII.
 *
 * The same defect as a language-specific `kind`, one layer down: an Arabic
 * edition writing « ٢٥-٢٢٥ » where the French writes « 25-225 » produces two
 * different decree numbers for one decree, and the two rows never merge. The
 * model used ASCII digits when this was measured, but nothing in the schema
 * requires it, so the fold happens at the boundary rather than being assumed
 * away.
 */
const foldDigits = (input: string): string =>
  input
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));

const stringArray = (value: unknown, allowed?: readonly string[]): string[] => {
  if (!Array.isArray(value)) return [];
  const items = value.filter((v): v is string => typeof v === "string" && v.trim() !== "");
  const filtered = allowed ? items.filter((v) => allowed.includes(v)) : items;
  return [...new Set(filtered)];
};

/**
 * A deterministic identity for a decree, stable across re-parses and across
 * editions.
 *
 * **Every component here must be language-independent**, because this key is
 * what merges the French and the Arabic extraction of the same decree. An
 * earlier version keyed on `kind` as written in the document, which meant
 * `decret executif 25 225` and `مرسوم تنفيذي رقم 25 225` were different keys —
 * so both editions stored their own row and every decree was published to the
 * user twice. That is why the extraction prompt requires `kind` in French
 * regardless of the document's language, and a French title even for the Arabic
 * edition: they are identity fields first and display fields second.
 *
 * The number is the natural identity. Plenty of texts have none —
 * communications, erratum, statutes published as annexes — and for those the
 * French title is the identity, normalised so that a change in spacing or
 * accents between two parses does not mint a second row.
 *
 * Known limit: an unnumbered decree is identified by its title, and the Arabic
 * edition's `titleFr` is a translation rather than the same string, so those
 * can still produce one row per edition. Bounded in practice — numbered texts
 * are the ones that carry obligations — but it is a real gap rather than a
 * guarantee.
 */
export function dedupeKeyFor(decree: ExtractedDecree): string {
  const number = foldDigits(decree.number?.trim() ?? "");
  if (number) return normalizeText(`${decree.kind} ${number}`).slice(0, 300);

  const title = normalizeText(decree.titleFr ?? decree.titleAr ?? "");
  if (title) return `${normalizeText(decree.kind)}:${title}`.slice(0, 300);

  // No number, no title — nothing distinguishes this text from another, so it
  // is keyed by what is left. Rare, and better than a row that cannot dedupe.
  return normalizeText(`${decree.kind} ${decree.publishedOn ?? ""}`).slice(0, 300) || "unknown";
}

export async function extractIssue(params: {
  bytes: Buffer;
  edition: Edition;
  year: number;
  issueNumber: number;
}): Promise<ExtractedIssue> {
  const { bytes, edition, year, issueNumber } = params;

  /**
   * The Arabic edition is asked for French fields as well, and that is not
   * padding. Two things depend on it:
   *
   * - The application is French-language. A decree that only the Arabic edition
   *   carries — which happens, and is why both are crawled — would otherwise
   *   reach the user as a wall of Arabic with no French anywhere.
   * - `dedupeKeyFor` identifies a decree by its French designation. Without a
   *   French title the Arabic row and the French row cannot be recognised as
   *   the same text, and the user gets the same decree twice.
   */
  const languageNote =
    edition === "ARABIC"
      ? "Ce document est l'édition ARABE du Journal Officiel. Renseigne titleAr et summaryAr avec le texte arabe d'origine, ET titleFr et summaryFr avec leur traduction française."
      : "Ce document est l'édition FRANÇAISE du Journal Officiel. Renseigne titleFr et summaryFr. Laisse titleAr et summaryAr vides — cette édition ne contient pas de texte arabe.";

  const raw = await generateJson<{ publishedOn?: string; decrees?: unknown[] }>({
    contents: [
      {
        inlineData: {
          mimeType: "application/pdf",
          data: bytes.toString("base64"),
        },
      },
      {
        text:
          `Journal Officiel n° ${issueNumber} de l'année ${year}. ${languageNote}\n\n` +
          `Extrais chaque texte qu'il contient selon les règles fournies.`,
      },
    ],
    systemInstruction: EXTRACTION_RULES,
    // Low but not zero: the task is faithful extraction, and sampling noise here
    // shows up as an issue that yields 38 decrees instead of 40.
    temperature: 0.1,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        publishedOn: { type: Type.STRING },
        decrees: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              kind: { type: Type.STRING },
              number: { type: Type.STRING },
              titleFr: { type: Type.STRING },
              titleAr: { type: Type.STRING },
              summaryFr: { type: Type.STRING },
              summaryAr: { type: Type.STRING },
              publishedOn: { type: Type.STRING },
              pageFrom: { type: Type.INTEGER },
              topics: { type: Type.ARRAY, items: { type: Type.STRING } },
              sectors: {
                type: Type.ARRAY,
                items: { type: Type.STRING, enum: sectorCodes() },
              },
              legalForms: {
                type: Type.ARRAY,
                items: { type: Type.STRING, enum: [...LEGAL_FORMS] },
              },
              taxRegimes: {
                type: Type.ARRAY,
                items: { type: Type.STRING, enum: [...TAX_REGIMES] },
              },
              confidence: { type: Type.NUMBER },
            },
            required: ["kind", "titleFr", "titleAr"],
          },
        },
      },
      required: ["decrees"],
    },
  });

  const decrees: ExtractedDecree[] = (raw.decrees ?? [])
    .filter((d): d is Record<string, unknown> => typeof d === "object" && d !== null)
    .map((d) => ({
      kind: (nullIfEmpty(d["kind"]) ?? "Texte").slice(0, 60),
      number: (() => {
        const n = nullIfEmpty(d["number"]);
        return n ? foldDigits(n).slice(0, 60) : null;
      })(),
      titleFr: nullIfEmpty(d["titleFr"]),
      titleAr: nullIfEmpty(d["titleAr"]),
      summaryFr: nullIfEmpty(d["summaryFr"]),
      summaryAr: nullIfEmpty(d["summaryAr"]),
      publishedOn: nullIfEmpty(d["publishedOn"]),
      pageFrom: numberOrNull(d["pageFrom"]),
      topics: stringArray(d["topics"]),
      sectors: knownSectors(d["sectors"]),
      legalForms: stringArray(d["legalForms"], LEGAL_FORMS),
      taxRegimes: stringArray(d["taxRegimes"], TAX_REGIMES),
      confidence: typeof d["confidence"] === "number" ? d["confidence"] : null,
    }))
    // A decree with neither a title nor a summary carries nothing a user could
    // act on, and would render as an empty alert.
    .filter((d) => d.titleFr || d.titleAr);

  return {
    publishedOn: nullIfEmpty(raw.publishedOn),
    decrees,
  };
}
