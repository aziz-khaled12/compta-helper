import {
  pgTable,
  uuid,
  varchar,
  numeric,
  date,
  integer,
} from "drizzle-orm/pg-core";
import { companiesTable } from "./companies";

export const fundingTable = pgTable("funding_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companiesTable.id, { onDelete: "cascade" }),
  source: varchar("source", { length: 20 }).notNull(),
  label: varchar("label", { length: 255 }),
  amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
  date: date("date").notNull(),
  interestRate: numeric("interest_rate", { precision: 6, scale: 3 }),
  durationMonths: integer("duration_months"),
});

export type FundingRow = typeof fundingTable.$inferSelect;
