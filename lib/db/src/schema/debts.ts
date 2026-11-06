import {
  pgTable,
  uuid,
  varchar,
  numeric,
  date,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { companiesTable } from "./companies";

/**
 * A balance carried over from the user's old books, plus anything they add
 * later by hand. `amount` is what was still owed on the day it was declared,
 * not the original invoice total: migrating users only know the outstanding
 * figure, and reconstructing history they never entered would be invention.
 *
 * `origin` exists so the dashboard can badge the rows that came from the
 * onboarding wizard as "old debts" and leave later entries unlabelled.
 */
export const debtsTable = pgTable(
  "debts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companiesTable.id, { onDelete: "cascade" }),
    /** The person or business on the other side of the balance. */
    personName: varchar("person_name", { length: 255 }).notNull(),
    /** `I_OWE` (payable) or `OWED_TO_ME` (receivable). */
    direction: varchar("direction", { length: 20 }).notNull(),
    amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
    date: date("date").notNull(),
    note: varchar("note", { length: 255 }),
    /** `ONBOARDING` for pre-config rows, `MANUAL` for later additions. */
    origin: varchar("origin", { length: 20 }).notNull().default("MANUAL"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("IDX_debt_company_id").on(table.companyId)],
);

export type DebtRow = typeof debtsTable.$inferSelect;
