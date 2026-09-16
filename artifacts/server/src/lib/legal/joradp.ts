import { logger } from "../logger";

/**
 * Source adapter for the Journal Officiel (joradp.dz).
 *
 * Everything that knows the site's URL shapes and HTML lives here, so that a
 * structural change upstream is a one-file fix. Nothing above this module sees
 * a URL, and nothing here knows what a decree is.
 */

/**
 * The index and the PDFs sit on different hosts, and both are kept as observed
 * rather than normalised to one: `www.joradp.dz` serves the yearly calendars,
 * and the bare host serves the files. Both resolve, but guessing which host
 * serves which path is exactly the kind of tidy-up that breaks silently later.
 */
const INDEX_HOST = "https://www.joradp.dz";
const FILE_HOST = "https://joradp.dz";

/**
 * Descriptive so the site's operators can identify the traffic and contact us
 * before blocking it. There is no `robots.txt` (the path 404s) and no stated
 * crawl policy, so the crawler rate-limits itself and sends this instead of
 * claiming to be a browser.
 */
const USER_AGENT =
  "DJERDJERA-Comptable/0.1 (legal-alert crawler; contact: app maintainer)";

const REQUEST_TIMEOUT_MS = 60_000;
const FETCH_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 1_000;

/**
 * The two published editions.
 *
 * These are separate documents, not translations of one file — see the note on
 * `legalSourcesTable.edition`. Both are crawled because recall differs between
 * them, which is measured rather than assumed.
 */
export const EDITIONS = ["FRENCH", "ARABIC"] as const;
export type Edition = (typeof EDITIONS)[number];

/** URL path segment and filename prefix per edition. */
const EDITION_PATHS: Record<Edition, { dir: string; prefix: string }> = {
  FRENCH: { dir: "jo-francais", prefix: "F" },
  ARABIC: { dir: "jo-arabe", prefix: "A" },
};

export interface DiscoveredIssue {
  year: number;
  issueNumber: number;
}

/**
 * Issue numbers are zero-padded to three digits in the filename: issue 53 of
 * 2025 is `F2025053.pdf`. Taken from the observed URLs rather than inferred —
 * a four-digit pad would 404 on every request.
 */
function padIssue(issueNumber: number): string {
  return String(issueNumber).padStart(3, "0");
}

export function pdfUrlFor(
  year: number,
  issueNumber: number,
  edition: Edition,
): string {
  const { dir, prefix } = EDITION_PATHS[edition];
  return `${FILE_HOST}/FTP/${dir}/${year}/${prefix}${year}${padIssue(issueNumber)}.pdf`;
}

export function indexUrlFor(year: number): string {
  return `${INDEX_HOST}/JRN/ZF${year}.htm`;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Full jitter, matching the Gemini client's policy and for the same reason. */
function backoffMs(attempt: number): number {
  return Math.round(Math.random() * BASE_BACKOFF_MS * 2 ** (attempt - 1));
}

/**
 * A plain fetch with a timeout and bounded retries.
 *
 * Retries cover transport failures and 5xx only. A 404 means the issue does not
 * exist under that name, which no amount of retrying will change — and it is a
 * legitimate answer here, since not every year has every issue number.
 */
async function fetchWithRetry(url: string): Promise<Response> {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= FETCH_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "*/*" },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (response.ok || response.status === 404) return response;

      if (response.status >= 500) {
        lastError = new Error(`HTTP ${response.status} from ${url}`);
        logger.warn(
          { url, status: response.status, attempt },
          "joradp fetch failed (retryable)",
        );
        if (attempt < FETCH_ATTEMPTS) await sleep(backoffMs(attempt));
        continue;
      }

      // 403/429 and friends: the site is telling us to stop. Surface it rather
      // than hammering, so the run is journalled as failed and visible.
      throw new Error(`HTTP ${response.status} from ${url}`);
    } catch (err) {
      lastError = err;
      logger.warn({ url, attempt, err: String(err) }, "joradp fetch threw");
      if (attempt < FETCH_ATTEMPTS) await sleep(backoffMs(attempt));
    }
  }

  throw lastError ?? new Error(`Failed to fetch ${url}`);
}

/**
 * Reads a year's calendar page and returns the issue numbers on it.
 *
 * The page is a calendar, not an index: every entry is a `javascript:MaxWin('053')`
 * link whose only other content is a `title="Journal N°53"` attribute. There is
 * no decree title, summary or page range anywhere on it — which is why the PDF
 * has to be downloaded and parsed rather than linked to.
 *
 * Both patterns are read and unioned on purpose. They carry the same numbers
 * today, so either alone would work, but they are independent attributes of the
 * same anchor: if the site ever drops one, this keeps working. A failure here
 * returns an empty list and logs, rather than throwing — a calendar that did not
 * parse is a quiet news week as far as the rest of the crawl is concerned, and
 * pretending otherwise would take down the run.
 */
export async function discoverIssues(year: number): Promise<DiscoveredIssue[]> {
  const url = indexUrlFor(year);
  const response = await fetchWithRetry(url);

  if (response.status === 404) {
    logger.warn({ url, year }, "joradp year index not found");
    return [];
  }

  const html = await response.text();
  const numbers = new Set<number>();

  for (const match of html.matchAll(/MaxWin\(\s*['"](\d{1,4})['"]\s*\)/gi)) {
    numbers.add(Number(match[1]));
  }
  for (const match of html.matchAll(
    /title\s*=\s*["']Journal\s*N°?\s*(\d{1,4})["']/gi,
  )) {
    numbers.add(Number(match[1]));
  }

  const issues = [...numbers]
    .filter((n) => Number.isInteger(n) && n > 0)
    .sort((a, b) => a - b)
    .map((issueNumber) => ({ year, issueNumber }));

  logger.info({ year, url, found: issues.length }, "joradp issues discovered");
  return issues;
}

export interface FetchedIssue {
  bytes: Buffer;
  contentType: string | null;
}

/**
 * Downloads one issue. Returns `null` for a 404 — an issue number that is
 * genuinely absent — so the caller can record a SKIPPED source instead of a
 * failure, keeping "this does not exist" distinguishable from "this broke".
 */
export async function fetchIssuePdf(url: string): Promise<FetchedIssue | null> {
  const response = await fetchWithRetry(url);
  if (response.status === 404) return null;

  const buffer = Buffer.from(await response.arrayBuffer());
  return {
    bytes: buffer,
    contentType: response.headers.get("content-type"),
  };
}
