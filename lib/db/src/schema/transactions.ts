import {
  pgTable,
  uuid,
  varchar,
  numeric,
  date,
  timestamp,
} from "drizzle-orm/pg-core";
import { companiesTable } from "./companies";

export const transactionsTable = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companiesTable.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  type: varchar("type", { length: 20 }).notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  amountHt: numeric("amount_ht", { precision: 18, scale: 2 }).notNull(),
  tvaRate: numeric("tva_rate", { precision: 6, scale: 3 }).notNull(),
  tvaAmount: numeric("tva_amount", { precision: 18, scale: 2 }).notNull(),
  amountTtc: numeric("amount_ttc", { precision: 18, scale: 2 }).notNull(),
  paymentMethod: varchar("payment_method", { length: 20 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(),
  thirdParty: varchar("third_party", { length: 255 }),
  category: varchar("category", { length: 100 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type TransactionRow = typeof transactionsTable.$inferSelect;
