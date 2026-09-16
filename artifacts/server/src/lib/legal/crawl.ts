import { createHash } from "node:crypto";
import {
  and,
  desc,
  eq,
  inArray,
  isNotNull,
  notInArray,
  sql,
  type SQL,
} from "drizzle-orm";
import {
  db,
  companiesTable,
  legalSourcesTable,
  legalDocumentsTable,
  companyLegalAlertsTable,
  crawlRunsTable,
  type LegalDocumentRow,
} from "@workspace/db";
import { logger } from "../logger";
import { EDITIONS, discoverIssues, fetchIssuePdf, pdfUrlFor, type Edition } from "./joradp";
import { dedupeKeyFor, extractIssue, type ExtractedDecree } from "./extractIssue";
import { matchDecree, type CompanyProfile } from "./matcher";

/**
 * The crawl job: discover → fetch → extract → dedupe → store → match.
 *
 * It is written as one bounded function rather than a queue of steps because
 * there is no job infrastructure in this repo, and the whole run is expected to
 * take minutes, not hours. Every loop is capped by an explicit option so that a
 * first backfill cannot run away with a year of issues and a few million tokens
 * in one go.
 */

/** Pause between JORADP requests. There is no stated crawl policy, so we set one. */
const JORADP_DELAY_MS = 1_500;

/** Issues processed per run by default. Six issues ≈ 12 fetches ≈ 220k tokens. */
const DEFAULT_MAX_ISSUES = 6;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** `YYYY-MM-DD` or null. A malformed date would otherwise fail the insert. */
function isoDateOrNull(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

/**
 * Merges two jsonb string arrays, keeping both sides.
 *
 * Used when the second edition of an issue is upserted onto the first. A decree
 * is stored once, but the French and Arabic editions are extracted
 * independently and tag different sectors and topics — so the merged row is
 * genuinely richer than either extraction. Plain assignment would silently
 * discard whichever edition was parsed second.
 */
function unionJsonArray(column: SQL | unknown, excludedName: string): SQL {
  return sql`(
    select coalesce(jsonb_agg(distinct elem order by elem), '[]'::jsonb)
      from jsonb_array_elements_text(
        ${column} || ${sql.raw(`excluded.${excludedName}`)}
      ) as elem
  )`;
}

/**
 * Keeps the existing value when it is set, and fills from the incoming row when
 * it is not. Unlike the arrays these are single strings: a French title has no
 * union with an Arabic one, and the first extraction that produced a value is
 * as good as the second.
 */
function keepExisting(column: SQL | unknown, excludedName: string): SQL {
  return sql`coalesce(${column}, ${sql.raw(`excluded.${excludedName}`)})`;
}

export interface CrawlOptions {
  /** Defaults to the current year. */
  year?: number;
  /** Hard cap on issues per run, after `skip`. */
  maxIssues?: number;
  /** Start this many issues back from the newest. */
  skip?: number;
  /**
   * Process exactly these issue numbers, ignoring `skip` and `maxIssues`.
   *
   * For backfilling or re-checking a specific issue by hand — the routine path
   * walks back from the newest, which is the right default for a scheduler but
   * useless when you need to look at the one issue you have evidence about.
   */
  only?: number[];
  /**
   * Re-fetch issues already marked PARSED.
   *
   * A normal run skips them, which is what makes daily increments cheap. But
   * the Journal Officiel does re-publish corrected issues under the same
   * number, and only a re-fetch can detect that — hence the stored `sha256`.
   * Turning this on is the deliberate, expensive way to look for corrections;
   * it is not part of the routine run.
   */
  force?: boolean;
}

export interface CrawlOutcome {
  runId: string;
  year: number;
  issuesSeen: number;
  issuesNew: number;
  documentsExtracted: number;
  alertsCreated: number;
  status: "OK" | "PARTIAL" | "FAILED";
  error: string | null;
}

/**
 * Stores one issue's decrees against a source row, returning the rows as they
 * now stand in the database.
 *
 * The *stored* row is returned rather than the in-memory decree, and that
 * distinction is load-bearing. A decree is extracted twice — once per edition —
 * and the second upsert merges new fields into the existing row. Matching the
 * in-memory decree would score the alert against whichever edition happened to
 * be parsed, while the row it was stored from holds the union of both.
 * Returning the row means matching always sees the same thing the user will.
 *
 * Returns rather than matches internally so that a caller re-matching an
 * existing corpus (a company that has just declared a sector) and a caller
 * matching freshly crawled documents take exactly the same code path.
 */
async function storeDecrees(
  sourceId: string,
  year: number,
  issueNumber: number,
  publishedOn: string | null,
  decrees: ExtractedDecree[],
): Promise<LegalDocumentRow[]> {
  const stored: LegalDocumentRow[] = [];

  for (const decree of decrees) {
    const dedupeKey = dedupeKeyFor(decree);
    const [row] = await db
      .insert(legalDocumentsTable)
      .values({
        sourceId,
        year,
        issueNumber,
        dedupeKey,
        docKind: decree.kind,
        docNumber: decree.number,
        titleFr: decree.titleFr,
        titleAr: decree.titleAr,
        summaryFr: decree.summaryFr,
        summaryAr: decree.summaryAr,
        publishedOn: isoDateOrNull(decree.publishedOn) ?? publishedOn,
        pageFrom: decree.pageFrom,
        topics: decree.topics,
        sectors: decree.sectors,
        legalForms: decree.legalForms,
        taxRegimes: decree.taxRegimes,
        confidence: decree.confidence != null ? String(decree.confidence) : null,
      })
      .onConflictDoUpdate({
        target: [
          legalDocumentsTable.year,
          legalDocumentsTable.issueNumber,
          legalDocumentsTable.dedupeKey,
        ],
        set: {
          // `sourceId` is deliberately absent: it records the edition a decree
          // was first seen in, and the second edition must not overwrite it.
          docKind: keepExisting(legalDocumentsTable.docKind, "doc_kind"),
          docNumber: keepExisting(legalDocumentsTable.docNumber, "doc_number"),
          titleFr: keepExisting(legalDocumentsTable.titleFr, "title_fr"),
          titleAr: keepExisting(legalDocumentsTable.titleAr, "title_ar"),
          summaryFr: keepExisting(legalDocumentsTable.summaryFr, "summary_fr"),
          summaryAr: keepExisting(legalDocumentsTable.summaryAr, "summary_ar"),
          publishedOn: keepExisting(legalDocumentsTable.publishedOn, "published_on"),
          pageFrom: keepExisting(legalDocumentsTable.pageFrom, "page_from"),
          topics: unionJsonArray(legalDocumentsTable.topics, "topics"),
          sectors: unionJsonArray(legalDocumentsTable.sectors, "sectors"),
          legalForms: unionJsonArray(legalDocumentsTable.legalForms, "legal_forms"),
          taxRegimes: unionJsonArray(legalDocumentsTable.taxRegimes, "tax_regimes"),
          confidence: keepExisting(legalDocumentsTable.confidence, "confidence"),
        },
      })
      .returning();

    if (row) stored.push(row);
  }

  return stored;
}

/**
 * Scores a set of documents against every company and writes the alerts.
 *
 * Companies are read once per batch rather than once per document — the corpus
 * is small but the cross product is not, and the read is the cheap half.
 * Conflicts are ignored rather than updated: an alert the user has already
 * acknowledged should not be resurrected by a re-crawl.
 */
async function matchDocumentsForAllCompanies(
  documents: LegalDocumentRow[],
): Promise<number> {
  if (documents.length === 0) return 0;

  const companies = await db
    .select({
      id: companiesTable.id,
      sectorCode: companiesTable.sectorCode,
      legalForm: companiesTable.legalForm,
      taxRegime: companiesTable.taxRegime,
    })
    .from(companiesTable)
    // Unowned rows are rows that predate ownership, and `getActiveCompanyId`
    // deliberately never resolves one. Matching against them would write alerts
    // that no request can ever read — harmless per row, but this is a cross
    // product of companies and an ever-growing corpus, so the waste is not.
    .where(isNotNull(companiesTable.userId));

  if (companies.length === 0) return 0;

  const rows: (typeof companyLegalAlertsTable.$inferInsert)[] = [];

  for (const company of companies) {
    const profile: CompanyProfile = {
      sectorCode: company.sectorCode,
      legalForm: company.legalForm,
      taxRegime: company.taxRegime,
    };
    for (const doc of documents) {
      const match = matchDecree(doc, profile);
      if (!match) continue;
      rows.push({
        companyId: company.id,
        documentId: doc.id,
        matchScore: String(match.score),
        relevance: match.relevance,
        matchedOn: match.matchedOn,
      });
    }
  }

  if (rows.length === 0) return 0;

  const inserted = await db
    .insert(companyLegalAlertsTable)
    .values(rows)
    .onConflictDoNothing({
      target: [companyLegalAlertsTable.companyId, companyLegalAlertsTable.documentId],
    })
    .returning({ id: companyLegalAlertsTable.id });

  return inserted.length;
}

/**
 * Recomputes every alert for one company against the whole stored corpus.
 *
 * This is what a company calls after declaring or changing its sector: the
 * corpus was crawled before that declaration existed, and matching only happens
 * as documents arrive, so without this an established company would see nothing
 * until the next issue was published.
 *
 * Acknowledged alerts keep their acknowledgement — the upsert refreshes the
 * score and the reason but leaves `acknowledgedAt` alone.
 *
 * It is a *recompute*, not a merge: alerts the company no longer matches are
 * removed. Without that, changing sector leaves the old sector's alerts in the
 * feed permanently, each still claiming `sectors: ["COM_GROS"]` — and the client
 * renders that as "Ce texte concerne directement votre secteur d'activité", in
 * the present tense, to a company that has left that sector. A wrong claim
 * stated plainly is worse than a missing one, which is the whole reason this
 * feature explains itself rather than showing codes.
 */
export async function refreshAlertsForCompany(
  companyId: string,
  limit = 1000,
): Promise<number> {
  const [company] = await db
    .select({
      id: companiesTable.id,
      sectorCode: companiesTable.sectorCode,
      legalForm: companiesTable.legalForm,
      taxRegime: companiesTable.taxRegime,
    })
    .from(companiesTable)
    .where(eq(companiesTable.id, companyId));

  if (!company) return 0;

  const documents = await db
    .select()
    .from(legalDocumentsTable)
    .orderBy(desc(legalDocumentsTable.publishedOn))
    .limit(limit);

  const profile: CompanyProfile = {
    sectorCode: company.sectorCode,
    legalForm: company.legalForm,
    taxRegime: company.taxRegime,
  };

  let written = 0;
  const matchedDocumentIds: string[] = [];
  for (const doc of documents) {
    const match = matchDecree(doc, profile);
    if (!match) continue;
    matchedDocumentIds.push(doc.id);

    const [row] = await db
      .insert(companyLegalAlertsTable)
      .values({
        companyId,
        documentId: doc.id,
        matchScore: String(match.score),
        relevance: match.relevance,
        matchedOn: match.matchedOn,
      })
      .onConflictDoUpdate({
        target: [companyLegalAlertsTable.companyId, companyLegalAlertsTable.documentId],
        set: {
          matchScore: String(match.score),
          relevance: match.relevance,
          matchedOn: match.matchedOn,
        },
      })
      .returning({ id: companyLegalAlertsTable.id });

    if (row) written++;
  }

  /**
   * Prune, bounded to the documents actually scanned.
   *
   * The bound is the point. `limit` caps the scan, so "everything the company
   * does not match" would delete real alerts for documents sitting outside the
   * window the moment the corpus grows past it — a silent data loss triggered by
   * a company merely editing its profile. Restricting the delete to `documents`
   * means an out-of-window alert is neither refreshed nor removed, which is the
   * honest thing to do with something this run did not look at.
   *
   * Acknowledgements are not spared. A stale alert is wrong whether or not
   * someone ticked it, and switching back to the old sector recreates it.
   */
  const pruned = await db
    .delete(companyLegalAlertsTable)
    .where(
      and(
        eq(companyLegalAlertsTable.companyId, companyId),
        inArray(
          companyLegalAlertsTable.documentId,
          documents.map((d) => d.id),
        ),
        notInArray(companyLegalAlertsTable.documentId, matchedDocumentIds),
      ),
    )
    .returning({ id: companyLegalAlertsTable.id });

  logger.info(
    { companyId, scanned: documents.length, written, pruned: pruned.length },
    "legal alerts refreshed",
  );
  return written;
}

/**
 * Runs one crawl, journalled in `crawl_runs`.
 *
 * Failures are per-issue and per-edition: one unparseable PDF marks its source
 * FAILED and the run continues as PARTIAL. The alternative — aborting the run —
 * would mean a single bad issue on the newest end blocks every older one
 * forever, which is the worst possible ordering for a backfill.
 */
export async function runCrawl(options: CrawlOptions = {}): Promise<CrawlOutcome> {
  const year = options.year ?? new Date().getFullYear();
  const maxIssues = options.maxIssues ?? DEFAULT_MAX_ISSUES;
  const skip = options.skip ?? 0;
  const force = options.force ?? false;

  const [run] = await db.insert(crawlRunsTable).values({ year }).returning();
  if (!run) throw new Error("Failed to open a crawl run");

  let issuesSeen = 0;
  let issuesNew = 0;
  let documentsExtracted = 0;
  let alertsCreated = 0;
  let failures = 0;
  let fatal: string | null = null;

  try {
    const discovered = await discoverIssues(year);
    const targets = options.only
      ? options.only.map((issueNumber) => ({ year, issueNumber }))
      : discovered.slice().reverse().slice(skip, skip + maxIssues);
    issuesSeen = targets.length;

    logger.info({ year, discovered: discovered.length, targets: issuesSeen }, "crawl starting");

    for (const issue of targets) {
      // Accumulated across both editions, then deduplicated before matching —
      // see the note below.
      const stored: LegalDocumentRow[] = [];
      let issuePublishedOn: string | null = null;

      for (const edition of EDITIONS) {
        const url = pdfUrlFor(year, issue.issueNumber, edition);

        try {
          const existing = await db
            .select({
              id: legalSourcesTable.id,
              status: legalSourcesTable.status,
              sha256: legalSourcesTable.sha256,
            })
            .from(legalSourcesTable)
            .where(
              and(
                eq(legalSourcesTable.year, year),
                eq(legalSourcesTable.issueNumber, issue.issueNumber),
                eq(legalSourcesTable.edition, edition),
              ),
            );

          const prior = existing[0];
          // Already parsed and not looking for corrections: nothing to do, and
          // no fetch. This is what keeps a daily run to one or two documents.
          if (prior && prior.status === "PARSED" && !force) continue;

          const fetched = await fetchIssuePdf(url);
          await sleep(JORADP_DELAY_MS);

          if (!fetched) {
            await db
              .insert(legalSourcesTable)
              .values({
                year,
                issueNumber: issue.issueNumber,
                edition,
                pdfUrl: url,
                status: "SKIPPED",
              })
              .onConflictDoUpdate({
                target: [
                  legalSourcesTable.year,
                  legalSourcesTable.issueNumber,
                  legalSourcesTable.edition,
                ],
                set: { status: "SKIPPED", error: null },
              });
            continue;
          }

          const sha256 = createHash("sha256").update(fetched.bytes).digest("hex");

          // The file changed under a number we have already parsed: a corrected
          // issue. Re-parsing is the point of storing the hash.
          if (prior?.status === "PARSED" && prior.sha256 === sha256) continue;

          const [source] = await db
            .insert(legalSourcesTable)
            .values({
              year,
              issueNumber: issue.issueNumber,
              edition,
              pdfUrl: url,
              pdfBytes: fetched.bytes.byteLength,
              sha256,
              status: "FETCHED",
              fetchedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: [
                legalSourcesTable.year,
                legalSourcesTable.issueNumber,
                legalSourcesTable.edition,
              ],
              set: {
                pdfBytes: fetched.bytes.byteLength,
                sha256,
                status: "FETCHED",
                error: null,
                fetchedAt: new Date(),
              },
            })
            .returning({ id: legalSourcesTable.id });

          if (!source) continue;
          if (!prior) issuesNew++;

          const extracted = await extractIssue({
            bytes: fetched.bytes,
            edition,
            year,
            issueNumber: issue.issueNumber,
          });

          issuePublishedOn ??= isoDateOrNull(extracted.publishedOn);

          stored.push(
            ...(await storeDecrees(
              source.id,
              year,
              issue.issueNumber,
              isoDateOrNull(extracted.publishedOn),
              extracted.decrees,
            )),
          );

          await db
            .update(legalSourcesTable)
            .set({
              status: "PARSED",
              parsedAt: new Date(),
              publishedOn: isoDateOrNull(extracted.publishedOn),
              error: null,
            })
            .where(eq(legalSourcesTable.id, source.id));

          logger.info(
            {
              year,
              issue: issue.issueNumber,
              edition,
              decrees: extracted.decrees.length,
            },
            "issue parsed",
          );
        } catch (err) {
          failures++;
          const message = err instanceof Error ? err.message : String(err);
          logger.error(
            { year, issue: issue.issueNumber, edition, err: message },
            "issue failed",
          );
          // Best-effort: if the source row exists, record the failure on it so
          // the next run retries this edition rather than skipping it.
          try {
            await db
              .update(legalSourcesTable)
              .set({ status: "FAILED", error: message })
              .where(
                and(
                  eq(legalSourcesTable.year, year),
                  eq(legalSourcesTable.issueNumber, issue.issueNumber),
                  eq(legalSourcesTable.edition, edition),
                ),
              );
          } catch {
            // The original failure is the one worth reporting.
          }
        }
      }

      // Both editions describe the same decrees, so the same document id comes
      // back twice — the first time as the edition that created it, the second
      // as the merged row. Keeping the last occurrence keeps the merged one.
      const merged = [...new Map(stored.map((d) => [d.id, d])).values()];
      documentsExtracted += merged.length;

      // Matched after both editions, not per edition: an alert is written once
      // and `onConflictDoNothing` never revisits it, so scoring it against the
      // French-only row would freeze an incomplete reason for a document the
      // Arabic edition later enriched.
      alertsCreated += await matchDocumentsForAllCompanies(merged);

      // The issue-level date is finer than what the PDF gives us per text, so
      // it backfills any document the extraction left undated.
      if (issuePublishedOn && merged.length > 0) {
        await db
          .update(legalDocumentsTable)
          .set({ publishedOn: issuePublishedOn })
          .where(
            and(
              inArray(
                legalDocumentsTable.id,
                merged.map((d) => d.id),
              ),
              sql`${legalDocumentsTable.publishedOn} is null`,
            ),
          );
      }
    }
  } catch (err) {
    fatal = err instanceof Error ? err.message : String(err);
    logger.error({ err: fatal, year }, "crawl failed");
  }

  const status: CrawlOutcome["status"] = fatal
    ? "FAILED"
    : failures > 0
      ? "PARTIAL"
      : "OK";

  await db
    .update(crawlRunsTable)
    .set({
      finishedAt: new Date(),
      issuesSeen,
      issuesNew,
      documentsExtracted,
      status,
      error: fatal,
    })
    .where(eq(crawlRunsTable.id, run.id));

  const outcome: CrawlOutcome = {
    runId: run.id,
    year,
    issuesSeen,
    issuesNew,
    documentsExtracted,
    alertsCreated,
    status,
    error: fatal,
  };
  logger.info(outcome, "crawl finished");
  return outcome;
}

export type { Edition };
