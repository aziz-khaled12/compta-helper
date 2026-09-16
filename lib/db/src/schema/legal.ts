import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  numeric,
  date,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { companiesTable } from "./companies";

/**
 * The JORADP crawl corpus.
 *
 * Three tables, deliberately separated by *what changes*: a source file is
 * fetched and parsed, a document is extracted from it, and an alert is a
 * company-specific judgement about a document. Re-parsing a source replaces
 * documents without touching alerts; a company changing sector recomputes
 * alerts without re-fetching anything.
 */

/** A file we fetch: one issue of the Journal Officiel, in one language. */
export const legalSourcesTable = pgTable(
  "legal_sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    year: integer("year").notNull(),
    issueNumber: integer("issue_number").notNull(),
    /**
     * The Journal Officiel is published twice — a French edition and an Arabic
     * one — at different URLs, and they are genuinely different documents.
     *
     * Two fetches per issue is not redundancy: the French edition carries no
     * Arabic text at all (the embedded Arabic fonts are unused), and on issue
     * 53/2025 the Arabic edition surfaced a presidential decree the French
     * extraction missed entirely. Merging both is better recall than either.
     * It roughly doubles crawl cost, which is why bounds matter in `crawl.ts`.
     */
    edition: varchar("edition", { length: 10 }).notNull(),
    publishedOn: date("published_on"),
    pdfUrl: text("pdf_url").notNull(),
    pdfBytes: integer("pdf_bytes"),
    /**
     * Content hash of the fetched file.
     *
     * The site can re-publish an issue under the same number (corrections are
     * common in the Journal Officiel). Without this, a re-published issue would
     * look already-crawled and the correction would never be seen. With it, a
     * changed hash re-opens the source for parsing.
     */
    sha256: varchar("sha256", { length: 64 }),
    /** PENDING → FETCHED → PARSED, or FAILED with `error` set. */
    status: varchar("status", { length: 16 }).notNull().default("PENDING"),
    error: text("error"),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }),
    parsedAt: timestamp("parsed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("UQ_legal_source_issue").on(
      table.year,
      table.issueNumber,
      table.edition,
    ),
    // The crawl walks years in order and skips what it has already seen.
    index("IDX_legal_source_year").on(table.year, table.issueNumber),
  ],
);

/**
 * One decree, arrêté, or other text found inside an issue.
 *
 * Keyed by *decree identity*, not by the source row it came from — because both
 * editions describe the same decrees, and a company must see one alert per
 * decree, not one per edition it happened to be extracted from. The two
 * editions are merged into a single row: French fields come from the French
 * edition, Arabic fields from the Arabic edition, and a decree present in only
 * one edition still lands here.
 */
export const legalDocumentsTable = pgTable(
  "legal_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /**
     * The edition this row was first extracted from. Kept for tracing and for
     * re-parsing, not as part of the row's identity — see `dedupeKey`.
     */
    sourceId: uuid("source_id")
      .notNull()
      .references(() => legalSourcesTable.id, { onDelete: "cascade" }),
    /** Denormalised from the source so decree identity is a local key. */
    year: integer("year").notNull(),
    issueNumber: integer("issue_number").notNull(),
    /**
     * Deterministic identity for the decree: kind + number where the text has a
     * number, falling back to a slug of its title when it does not.
     *
     * Computed in code rather than derived from a column, because the naive
     * `UNIQUE (source, kind, number)` fails in two directions: a decree is
     * published in *both* editions and would be stored twice, and many texts in
     * an issue (communications, erratum, appointments) carry no number at all —
     * and Postgres treats every NULL in a unique index as distinct, so those
     * would silently duplicate on every re-parse.
     */
    dedupeKey: varchar("dedupe_key", { length: 300 }).notNull(),
    docKind: varchar("doc_kind", { length: 60 }).notNull(),
    docNumber: varchar("doc_number", { length: 60 }),
    titleFr: text("title_fr"),
    titleAr: text("title_ar"),
    summaryFr: text("summary_fr"),
    summaryAr: text("summary_ar"),
    publishedOn: date("published_on"),
    pageFrom: integer("page_from"),
    /** Free-form topic tags, e.g. "fiscalité", "douane", "santé". */
    topics: jsonb("topics").$type<string[]>().notNull().default([]),
    /**
     * Sector codes drawn from the *closed* vocabulary in `@workspace/sectors`.
     *
     * The extraction model is constrained to this list by its response schema,
     * so matching is a set intersection in `matcher.ts` rather than a judgement
     * call by the model. That is what keeps "why does this concern me?"
     * answerable with a specific reason instead of a plausible story.
     */
    sectors: jsonb("sectors").$type<string[]>().notNull().default([]),
    /** `EURL | SARL | SNC | SPA | Personne Physique`, or empty for "all". */
    legalForms: jsonb("legal_forms").$type<string[]>().notNull().default([]),
    /** `FORFAITAIRE | REEL`, or empty for "all". */
    taxRegimes: jsonb("tax_regimes").$type<string[]>().notNull().default([]),
    confidence: numeric("confidence", { precision: 4, scale: 3 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("UQ_legal_document_identity").on(
      table.year,
      table.issueNumber,
      table.dedupeKey,
    ),
    // The crawl looks up "everything published since X" on every run.
    index("IDX_legal_document_published").on(table.publishedOn),
  ],
);

/**
 * A document judged relevant to one company.
 *
 * The match is recomputed from the stored document, never from a model's
 * opinion: `matchedOn` records the exact signals that fired, so the "pourquoi
 * ce texte me concerne" explanation the UI shows is derived from the same data
 * that produced the score and cannot drift from it.
 */
export const companyLegalAlertsTable = pgTable(
  "company_legal_alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companiesTable.id, { onDelete: "cascade" }),
    documentId: uuid("document_id")
      .notNull()
      .references(() => legalDocumentsTable.id, { onDelete: "cascade" }),
    matchScore: numeric("match_score", { precision: 4, scale: 3 }).notNull(),
    /** HIGH | MEDIUM | LOW — the band `matchScore` fell into. */
    relevance: varchar("relevance", { length: 10 }).notNull(),
    /**
     * The signals behind the score: which sector codes matched, which keywords
     * were found, whether the legal form or régime agreed. Structured rather
     * than prose so the client renders the reason in the user's language
     * instead of echoing a sentence the server generated.
     */
    matchedOn: jsonb("matched_on")
      .$type<{
        sectors: string[];
        keywords: string[];
        legalForm: boolean;
        taxRegime: boolean;
      }>()
      .notNull(),
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("UQ_company_legal_alert").on(table.companyId, table.documentId),
    index("IDX_company_legal_alert_company").on(table.companyId),
  ],
);

/**
 * One row per crawl attempt, successful or not.
 *
 * The scheduler runs unattended, so without this a run that silently stopped
 * working — JORADP changed its HTML, the model started refusing — would look
 * exactly like a quiet news week.
 */
export const crawlRunsTable = pgTable("crawl_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  startedAt: timestamp("started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  year: integer("year"),
  issuesSeen: integer("issues_seen").notNull().default(0),
  issuesNew: integer("issues_new").notNull().default(0),
  documentsExtracted: integer("documents_extracted").notNull().default(0),
  /** RUNNING | OK | PARTIAL | FAILED — PARTIAL means some issues failed. */
  status: varchar("status", { length: 16 }).notNull().default("RUNNING"),
  error: text("error"),
});

export type LegalSourceRow = typeof legalSourcesTable.$inferSelect;
export type LegalDocumentRow = typeof legalDocumentsTable.$inferSelect;
export type CompanyLegalAlertRow = typeof companyLegalAlertsTable.$inferSelect;
export type CrawlRunRow = typeof crawlRunsTable.$inferSelect;
