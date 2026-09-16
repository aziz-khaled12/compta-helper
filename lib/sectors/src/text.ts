/**
 * Text normalisation shared by the sector search box (client) and the decree
 * matcher (server).
 *
 * It lives here rather than in either consumer because the two must agree: a
 * keyword that matches in the picker but not in the matcher — or the reverse —
 * is a bug that is very hard to see. Normalising in one place is what keeps
 * "Bâtiment", "batiment" and "البناء" comparable.
 */

/**
 * Combining marks used only in Arabic script: the harakat and related marks in
 * U+0610–U+061A, U+064B–U+065F, the superscript alef U+0670, and the Quranic
 * annotation ranges U+06D6–U+06DC, U+06DF–U+06E8, U+06EA–U+06ED.
 *
 * Written as escapes rather than as literal characters on purpose: the literal
 * forms are combining marks, so they render attached to the surrounding text
 * and are effectively unreviewable in a diff.
 */
const ARABIC_DIACRITICS =
  /[ؐ-ًؚ-ٰٟۖ-ۜ۟-۪ۨ-ۭ]/g;

/** U+0640, the decorative letter-tatweel used to stretch Arabic words. */
const TATWEEL = /ـ/g;

/** Latin combining marks left behind by NFD decomposition. */
const LATIN_COMBINING = /[̀-ͯ]/g;

/**
 * Folds a string to a comparable form: lowercase, unaccented, undiacriticised,
 * with punctuation collapsed to single spaces and Arabic letter variants
 * unified.
 *
 * The Arabic letter folding matters more than it looks. `أ إ آ ٱ` are all
 * written as bare `ا` in ordinary text, `ى` is routinely written as `ي`, and
 * `ة` is often written as `ه` — so a title that reads "الفلاحة" in one decree
 * and "ألفلاحة" in another must fold to the same string, or the match fails on
 * a spelling difference that carries no meaning.
 */
export function normalizeText(input: string): string {
  return (
    input
      .normalize("NFD")
      .replace(LATIN_COMBINING, "")
      .replace(ARABIC_DIACRITICS, "")
      .replace(TATWEEL, "")
      .toLowerCase()
      .replace(/[أإآٱ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ة/g, "ه")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim()
  );
}

/**
 * True when `needle` appears in `haystack` as a whole word rather than as a
 * substring of a longer one.
 *
 * Without the word-boundary check the keyword "art" would match "artichaut"
 * and "carton", and a building-materials decree would be reported to an art
 * gallery. Both arguments are expected to be already normalised.
 */
export function containsWord(haystack: string, needle: string): boolean {
  if (!needle) return false;
  return ` ${haystack} `.includes(` ${needle} `);
}
