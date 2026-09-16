import {
  pgTable,
  uuid,
  varchar,
  date,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { companiesTable } from "./companies";

/**
 * The narration cache for the Rapports insights.
 *
 * The detectors run in the browser — the reports page is client-side by
 * convention — so the server never sees the company's ledger. It receives only
 * the `Finding[]` the client already computed, and this table is where the
 * prose it writes back is kept.
 *
 * `findingsHash` is the point of the table. It is a hash of the *findings*, not
 * of the period, so a company that reloads the page without changing its books
 * gets the cached narrative instead of paying for the same paragraph twice.
 * Two companies with identical findings would also share a row were it not for
 * `companyId` being part of the lookup — and it deliberately is, because the
 * narrative names the company and is written in its context.
 */
export const insightRunsTable = pgTable(
  "insight_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companiesTable.id, { onDelete: "cascade" }),
    periodFrom: date("period_from"),
    periodTo: date("period_to"),
    /** sha256 of the canonicalised findings payload. */
    findingsHash: varchar("findings_hash", { length: 64 }).notNull(),
    /** The findings exactly as they were narrated, so a hit can be replayed. */
    findings: jsonb("findings").notNull(),
    /** `{ summary, priorities: [{ ruleId, whyItMatters, action }] }`. */
    narrative: jsonb("narrative").notNull(),
    /** The model that produced it, so a stale narrative is identifiable. */
    model: varchar("model", { length: 60 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("IDX_insight_run_lookup").on(table.companyId, table.findingsHash),
  ],
);

export type InsightRunRow = typeof insightRunsTable.$inferSelect;
